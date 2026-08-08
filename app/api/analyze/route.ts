import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateObject } from 'ai'

const Body = z.object({
  description: z.string().trim().min(2).max(1000),
  portion: z.string().trim().min(1).max(100),
  consumed_at: z.string().datetime(),
})

const Nutrition = z.object({
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative(),
  sugar_g: z.number().nonnegative(),
  added_sugar_g: z.number().nonnegative(),
  sodium_mg: z.number().nonnegative(),
  potassium_mg: z.number().nonnegative(),
  calcium_mg: z.number().nonnegative(),
  iron_mg: z.number().nonnegative(),
  magnesium_mg: z.number().nonnegative(),
  vitamin_a_pct: z.number().nonnegative(),
  vitamin_b6_pct: z.number().nonnegative(),
  vitamin_b12_pct: z.number().nonnegative(),
  vitamin_c_pct: z.number().nonnegative(),
  vitamin_d_pct: z.number().nonnegative(),
  vitamin_e_pct: z.number().nonnegative(),
  vitamin_k_pct: z.number().nonnegative(),
  folate_pct: z.number().nonnegative(),
})

const Alcohol = z.object({
  present: z.boolean(),
  beverage_type: z.string().nullable(),
  quantity: z.number().nonnegative(),
  serving_oz: z.number().nonnegative(),
  estimated_abv: z.number().min(0).max(1).nullable(),
  standard_drinks: z.number().nonnegative(),
  alcohol_calories: z.number().nonnegative(),
})

const Analysis = z.object({
  classification: z.enum(['food', 'alcohol', 'food_and_alcohol', 'non_caloric_beverage']),
  confidence: z.enum(['high', 'medium', 'low']),
  nutrition: Nutrition,
  alcohol: Alcohol,
})

type AnalysisResult = z.infer<typeof Analysis>

const emptyNutrition: z.infer<typeof Nutrition> = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  added_sugar_g: 0,
  sodium_mg: 0,
  potassium_mg: 0,
  calcium_mg: 0,
  iron_mg: 0,
  magnesium_mg: 0,
  vitamin_a_pct: 0,
  vitamin_b6_pct: 0,
  vitamin_b12_pct: 0,
  vitamin_c_pct: 0,
  vitamin_d_pct: 0,
  vitamin_e_pct: 0,
  vitamin_k_pct: 0,
  folate_pct: 0,
}

const noAlcohol: z.infer<typeof Alcohol> = {
  present: false,
  beverage_type: null,
  quantity: 0,
  serving_oz: 0,
  estimated_abv: null,
  standard_drinks: 0,
  alcohol_calories: 0,
}

function fallbackAnalysis(description: string): AnalysisResult {
  const text = description.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim()

  if (/\b(pb ?&? ?j|peanut butter (and|&) jelly|peanut butter (and|&) jam)\b/.test(text)) {
    return {
      classification: 'food',
      confidence: 'medium',
      nutrition: {
        calories: 350,
        protein_g: 12,
        carbs_g: 46,
        fat_g: 15,
        fiber_g: 4,
        sugar_g: 18,
        added_sugar_g: 13,
        sodium_mg: 430,
        potassium_mg: 260,
        calcium_mg: 80,
        iron_mg: 2.2,
        magnesium_mg: 65,
        vitamin_a_pct: 0,
        vitamin_b6_pct: 8,
        vitamin_b12_pct: 0,
        vitamin_c_pct: 1,
        vitamin_d_pct: 0,
        vitamin_e_pct: 15,
        vitamin_k_pct: 1,
        folate_pct: 15,
      },
      alcohol: noAlcohol,
    }
  }

  const alcoholMatch = text.match(/\b(beer|wine|champagne|vodka|gin|rum|whiskey|whisky|bourbon|tequila|cocktail|martini|margarita)\b/)
  if (alcoholMatch) {
    const kind = alcoholMatch[1]
    const isWine = /wine|champagne/.test(kind)
    const isBeer = kind === 'beer'
    const servingOz = isBeer ? 12 : isWine ? 5 : 1.5
    const abv = isBeer ? 0.05 : isWine ? 0.12 : 0.4
    const alcoholCalories = Math.round(servingOz * abv * 0.789 * 29.5735 * 7)

    return {
      classification: 'alcohol',
      confidence: 'low',
      nutrition: { ...emptyNutrition, calories: alcoholCalories },
      alcohol: {
        present: true,
        beverage_type: kind,
        quantity: 1,
        serving_oz: servingOz,
        estimated_abv: abv,
        standard_drinks: 1,
        alcohol_calories: alcoholCalories,
      },
    }
  }

  return {
    classification: /\b(water|black coffee|unsweetened tea)\b/.test(text)
      ? 'non_caloric_beverage'
      : 'food',
    confidence: 'low',
    nutrition: emptyNutrition,
    alcohol: noAlcohol,
  }
}

async function analyze(description: string, portion: string) {
  try {
    const { object } = await generateObject({
      model: 'inclusionai/ling-3.0-tiny-free',
      schema: Analysis,
      maxRetries: 0,
      system:
        'You estimate nutrition for a food and alcohol intake diary. Use the stated portion. Return cautious best estimates based on typical USDA/FDA values. ABV is a decimal fraction. One US standard drink contains 0.6 fl oz pure alcohol. Include alcohol calories in total calories. Daily vitamin fields are percentages of FDA Daily Value. Never add commentary.',
      prompt: `Description: ${description}\nPortion: ${portion}`,
    })
    return { analysis: Analysis.parse(object), source: 'ai' as const }
  } catch (error) {
    console.warn('AI nutrition analysis unavailable; saving with fallback', error)
    return { analysis: fallbackAnalysis(description), source: 'fallback' as const }
  }
}

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json())
    const s = await createClient()
    const {
      data: { user },
    } = await s.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const { analysis: a, source } = await analyze(body.description, body.portion)
    const { data: entry, error } = await s
      .from('intake_entries')
      .insert({
        user_id: user.id,
        description: body.description,
        portion: body.portion,
        consumed_at: body.consumed_at,
        entry_type: a.classification,
      })
      .select()
      .single()

    if (error) throw error

    const { error: nError } = await s.from('nutrition_analyses').insert({
      entry_id: entry.id,
      user_id: user.id,
      ...a.nutrition,
      confidence: a.confidence,
      analysis_json: { ...a, source },
    })

    if (nError) {
      await s.from('intake_entries').delete().eq('id', entry.id)
      throw nError
    }

    if (a.alcohol.present) {
      const { error: alError } = await s.from('alcohol_analyses').insert({
        entry_id: entry.id,
        user_id: user.id,
        beverage_type: a.alcohol.beverage_type,
        quantity: a.alcohol.quantity,
        serving_oz: a.alcohol.serving_oz,
        abv: a.alcohol.estimated_abv,
        standard_drinks: a.alcohol.standard_drinks,
        alcohol_calories: a.alcohol.alcohol_calories,
      })
      if (alError) throw alError

      const { error: rError } = await s.from('bac_reminders').insert({
        user_id: user.id,
        related_entry_id: entry.id,
        next_reminder_at: new Date(
          new Date(body.consumed_at).getTime() + 30 * 60 * 1000,
        ).toISOString(),
        status: 'active',
      })
      if (rError) throw rError
    }

    return NextResponse.json({ ...a, entry_id: entry.id, analysis_source: source })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 },
    )
  }
}
