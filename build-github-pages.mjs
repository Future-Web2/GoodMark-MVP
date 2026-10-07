import {mkdir,readFile,readdir,writeFile,lstat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const legacyCommit='a651d2e063be6371aea7cd3a58e8cf2ee2977cc9';
const gitRoot=root.replaceAll('\\','/');

// Every file stays within its named source or output directory. Never remove
// existing folders: the V1 snapshot is immutable once a file has been captured.
function inside(folder,name){
 const base=path.resolve(folder);
 const target=path.resolve(base,name);
 const relative=path.relative(base,target);
 if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Unsafe build path: '+name);
 return target;
}
function git(args){
 const result=spawnSync('git',['-c',`safe.directory=${gitRoot}`,...args],{cwd:root,maxBuffer:64*1024*1024});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Git snapshot failed: '+result.stderr.toString('utf8').trim());
 return result.stdout;
}
async function statIfPresent(file){
 try{return await lstat(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}
}
async function directory(folder){
 const relative=path.relative(root,path.resolve(folder));
 if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Unsafe build directory: '+folder);
 let current=root;
 for(const segment of relative.split(path.sep).filter(Boolean)){
  current=inside(current,segment);
  const stat=await statIfPresent(current);
  if(stat&&(stat.isSymbolicLink()||!stat.isDirectory()))throw Error('Build folder must be a real directory: '+current);
  if(!stat)await mkdir(current);
 }
}
async function writeOutput(folder,name,content){
 const target=inside(folder,name);
 await directory(path.dirname(target));
 const stat=await statIfPresent(target);
 if(stat&&(stat.isSymbolicLink()||!stat.isFile()))throw Error('Build output must be a regular file: '+target);
 await writeFile(target,content);
}
async function copyTree(source,destination){
 await directory(destination);
 const sourceStat=await lstat(source);
 if(sourceStat.isSymbolicLink()||!sourceStat.isDirectory())throw Error('Build source must be a real directory: '+source);
 for(const item of await readdir(source,{withFileTypes:true})){
  const from=inside(source,item.name);
  const to=inside(destination,item.name);
  if(item.isSymbolicLink())throw Error('Symbolic links are not supported in static assets: '+from);
  if(item.isDirectory())await copyTree(from,to);
  else if(item.isFile())await writeOutput(destination,item.name,await readFile(from));
  else throw Error('Unsupported static asset: '+from);
 }
}

const dist=inside(root,'dist');
const snapshot=inside(root,'versions/v1');
const manifestFile=inside(root,'versions/v1-manifest.json');
const output=inside(root,'site');
const picker=await readFile(inside(root,'templates/version-picker.html'));
await directory(snapshot);

function validateManifest(manifest){
 if(!manifest||manifest.version!==1||manifest.commit!==legacyCommit||!Array.isArray(manifest.files)||!manifest.files.length)throw Error('Invalid frozen V1 manifest metadata.');
 const seen=new Set();
 for(const file of manifest.files){
  if(typeof file!=='string'||!file.startsWith('dist/')||file.includes('\\')||file.split('/').some(part=>!part||part==='.'||part==='..')||seen.has(file))throw Error('Invalid frozen V1 asset path: '+file);
  inside(snapshot,file.slice('dist/'.length));
  seen.add(file);
 }
 if(!seen.has('dist/index.html'))throw Error('Frozen V1 manifest is missing dist/index.html.');
 return manifest.files;
}
const manifestStat=await statIfPresent(manifestFile);
if(manifestStat&&(manifestStat.isSymbolicLink()||!manifestStat.isFile()))throw Error('V1 manifest must be a regular file.');
const hasManifest=Boolean(manifestStat);
const manifest=hasManifest?JSON.parse(await readFile(manifestFile,'utf8')):{
 version:1,
 commit:legacyCommit,
 files:git(['ls-tree','-r','-z','--name-only',legacyCommit,'--','dist']).toString('utf8').split('\0').filter(Boolean)
};
const legacyFiles=validateManifest(manifest);
for(const file of legacyFiles){
 const name=file.slice('dist/'.length);
 const target=inside(snapshot,name);
 await directory(path.dirname(target));
 const stat=await statIfPresent(target);
 if(stat){
  if(stat.isSymbolicLink()||!stat.isFile())throw Error('V1 snapshot must contain regular files: '+target);
  continue;
 }
 if(hasManifest)throw Error('Frozen V1 asset is missing: '+name+'. Commit the complete versions/v1 snapshot alongside its manifest.');
 const content=git(['show',`${legacyCommit}:${file}`]);
 try{await writeFile(target,content,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
}
if(!hasManifest)await writeOutput(path.dirname(manifestFile),path.basename(manifestFile),JSON.stringify(manifest,null,2)+'\n');

await directory(output);
const v1Output=inside(output,'v1');
await directory(v1Output);
for(const file of legacyFiles){
 const name=file.slice('dist/'.length);
 await writeOutput(v1Output,name,await readFile(inside(snapshot,name)));
}
await copyTree(dist,inside(output,'v2'));
await writeOutput(output,'index.html',picker);
await writeOutput(output,'.nojekyll','');
const favicon=inside(dist,'favicon.svg');
if(await statIfPresent(favicon))await writeOutput(output,'favicon.svg',await readFile(favicon));
console.log(`Built GitHub Pages version picker, frozen V1 (${legacyFiles.length} files), and current V2 in site/.`);
