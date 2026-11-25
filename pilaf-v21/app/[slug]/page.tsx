import pages from '../../lib/pages.json';
import {notFound} from 'next/navigation';
export function generateStaticParams(){return Object.keys(pages).filter(s=>!['index','shop','cart','checkout'].includes(s)).map(slug=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return {title:pages[slug as keyof typeof pages]?.title||'Not found'}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const page=pages[slug as keyof typeof pages];if(!Object.hasOwn(pages,slug)||!page||slug==='index')notFound();return <div dangerouslySetInnerHTML={{__html:page.html}}/>}
