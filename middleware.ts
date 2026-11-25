import {NextRequest,NextResponse} from 'next/server';
export function middleware(req:NextRequest){
 const path=req.nextUrl.pathname;
 if(path.startsWith('/api/') && !['GET','HEAD','OPTIONS'].includes(req.method) && path!='/api/stripe/webhook'){
  const origin=process.env.APP_ORIGIN;
  if(!origin || req.headers.get('origin')!==origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 }
 const res=NextResponse.next();
 if(path.startsWith('/admin')||path.startsWith('/api/admin')||path.startsWith('/api/account'))res.headers.set('Cache-Control','no-store');
 return res;
}
export const config={matcher:['/api/:path*','/admin/:path*']};
