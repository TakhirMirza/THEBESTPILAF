import pages from '../lib/pages.json';
export default function Home(){return <div dangerouslySetInnerHTML={{__html:pages.index.html}}/>}
