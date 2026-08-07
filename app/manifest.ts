import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest { return { name:'Intake', short_name:'Intake', description:'Food, nutrition, alcohol and BAC tracking', start_url:'/', display:'standalone', background_color:'#f7f7f4', theme_color:'#111111', icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml'}] } }
