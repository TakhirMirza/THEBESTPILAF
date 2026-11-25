import './globals.css';
import type {Metadata} from 'next';
import Shell from './shell';
export const metadata:Metadata={title:{default:'THE BEST PILAF',template:'%s | THE BEST PILAF'},description:'Discover THE BEST PILAF, a planned ready-to-eat Uzbek pilaf collection for the US market. Retail and wholesale inquiries.',icons:{icon:'/brand.svg'},openGraph:{title:'THE BEST PILAF | Authentic Uzbek Cuisine',description:'From Uzbekistan. To your table. A ready-to-eat pilaf collection in development.',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><Shell>{children}</Shell></body></html>}
