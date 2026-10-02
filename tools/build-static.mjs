import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'dist');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of ['index.html','assets','about','contact','services','favicon.ico','robots.txt','sitemap.xml']) {
 await cp(join(root,name),join(output,name),{recursive:true,filter:source=>!source.split(/[\\/]/).some(part=>part.startsWith('.'))});
}
console.log('Built public site in dist. Configuration, notes and tools excluded.');
