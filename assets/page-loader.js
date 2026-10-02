
(() => {
const root=document.getElementById('jygen-wave-loader');
if(!root)return;
if(!document.documentElement.classList.contains('jygen-opening-load')){root.remove();return;}
const bar=root.querySelector('.loading-line span');
let completed=false;
const began=performance.now();
const originalOverflow=document.documentElement.style.overflow;
document.documentElement.style.overflow='hidden';
function finish(){
 if(completed)return;completed=true;bar.style.width='100%';
 setTimeout(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let removed=false;
  const release=()=>{if(removed)return;removed=true;root.remove();document.documentElement.classList.remove('jygen-opening-load');document.documentElement.style.overflow=originalOverflow;};
  root.addEventListener('transitionend',event=>{if(event.target===root&&event.propertyName==='opacity')release();});
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   root.classList.add('is-complete');
   if(reduced)release();else setTimeout(release,1050);
  }));
 },Math.max(180,2000-(performance.now()-began)));
}
// Progress counts required resources that have loaded or returned an error.
// No timer advances progress or forces completion on a slow connection.
window.addEventListener('pageshow',event=>{if(event.persisted){completed=true;root.remove();document.documentElement.classList.remove('jygen-opening-load');document.documentElement.style.overflow=originalOverflow;}});
const pageReady=new Promise(resolve=>{
 if(document.readyState==='complete')resolve();
 else window.addEventListener('load',resolve,{once:true});
});
function trackReadiness(){
 const settledElement=element=>new Promise(resolve=>{
  element.addEventListener('load',resolve,{once:true});
  element.addEventListener('error',resolve,{once:true});
 });
 const work=[Promise.resolve(),pageReady];
 for(const image of document.images){
  if(image.loading==='lazy')continue;
  work.push(image.complete?Promise.resolve():settledElement(image));
 }
 for(const link of document.querySelectorAll('link[rel="stylesheet"]')){
  work.push(link.sheet?Promise.resolve():Promise.race([settledElement(link),pageReady]));
 }
 for(const script of document.querySelectorAll('script[src]')){
  const loaded=performance.getEntriesByName(script.src).some(entry=>entry.responseEnd>0);
  work.push(loaded?Promise.resolve():Promise.race([settledElement(script),pageReady]));
 }
 if(document.fonts)work.push(document.fonts.ready);
 let settled=0;
 bar.style.width='0%';
 for(const task of work)Promise.resolve(task).catch(()=>{}).then(()=>{
  settled++;
  if(!completed)bar.style.width=Math.min(99,100*settled/work.length)+'%';
 });
 Promise.allSettled(work).then(finish);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',trackReadiness,{once:true});else trackReadiness();
const canvas=root.querySelector('canvas');
const gl=canvas.getContext('webgl',{antialias:false});
if(!gl)return;
const VERT="attribute vec2 a_position;\nvoid main() {\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}";
const FRAG="#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n\nuniform vec3 u_colors[8];\n// Seven packed vectors + eight colour vectors = 15 fragment uniform vectors,\n// one below WebGL1's guaranteed minimum. Macros preserve the public u_* API.\nuniform vec4 u_scene;      // resolution.xy, time, colour count\nuniform vec4 u_shape;      // scale, intensity, paramA, warp\nuniform vec4 u_surface;    // detail, contrast, brightness, saturation\nuniform vec4 u_finish;     // hue, vignette, blur, grain\nuniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle\nuniform vec4 u_space;      // offset.xy, pointer.xy\nuniform vec4 u_cursor;\n\n#define u_resolution u_scene.xy\n#define u_time u_scene.z\n#define u_colorCount u_scene.w\n#define u_scale u_shape.x\n#define u_intensity u_shape.y\n#define u_paramA u_shape.z\n#define u_warp u_shape.w\n#define u_detail u_surface.x\n#define u_contrast u_surface.y\n#define u_brightness u_surface.z\n#define u_saturation u_surface.w\n#define u_hue u_finish.x\n#define u_vignette u_finish.y\n#define u_blur u_finish.z\n#define u_grain u_finish.w\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n#define u_seed u_transform.x\n#else\n// Keep hash inputs inside mediump's guaranteed \u00b12^14 range.\n#define u_seed mod(u_transform.x, 31.0)\n#endif\n#define u_rotate u_transform.y\n#define u_drift u_transform.z\n#define u_oklab u_transform.w\n#define u_offset u_space.xy\n#define u_mouse u_space.zw\n#define u_cursorPresence u_cursor.x\n#define u_cursorEffect u_cursor.y\n#define u_cursorStrength u_cursor.z\n#define u_cursorRadius u_cursor.w\n\nfloat hash21(vec2 p) {\n#ifndef GL_FRAGMENT_PRECISION_HIGH\n  p = mod(p, 31.0);\n#endif\n  p = fract(p * vec2(234.34, 435.345));\n  p += dot(p, p + 34.23);\n  return fract(p.x * p.y);\n}\n\n// Even, un-structured white noise for film grain (Dave Hoskins hash12). The\n// multiply hash above is fine for value noise but shows a faint axis-aligned\n// mesh at integer fragment coords, which reads as a net over flat areas.\nfloat grainHash(vec2 p) {\n  vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n  p3 += dot(p3, p3.yzx + 33.33);\n  return fract((p3.x + p3.y) * p3.z);\n}\n\nvec2 hash22(vec2 p) {\n#ifndef GL_FRAGMENT_PRECISION_HIGH\n  p = mod(p, 31.0);\n#endif\n  float n = sin(dot(p, vec2(41.0, 289.0)));\n  return fract(vec2(15731.743, 7892.321) * n);\n}\n\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n  return mix(\n    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),\n    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),\n    u.y);\n}\n\nfloat fbm(vec2 p) {\n  float v = 0.0;\n  float a = 0.5;\n  for (int i = 0; i < 5; i++) {\n    v += a * noise(p);\n    p = p * 2.03 + vec2(17.0, 9.2);\n    a *= 0.5;\n  }\n  return v;\n}\n\n// --- OKLab colour mixing (perceptual), gated by u_oklab -----------------------\nvec3 srgbToLinear(vec3 c) {\n  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),\n    step(0.04045, c));\n}\nvec3 linearToSrgb(vec3 c) {\n  // max() guards the sRGB branch: out-of-gamut OKLab interpolations can send a\n  // channel negative, and pow(negative, \u2026) is NaN which mix()/step() would\n  // then propagate. The linear branch clips such channels to 0 downstream.\n  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,\n    step(0.0031308, c));\n}\nvec3 linToOklab(vec3 c) {\n  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;\n  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;\n  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;\n  l = pow(max(l, 0.0), 1.0 / 3.0);\n  m = pow(max(m, 0.0), 1.0 / 3.0);\n  s = pow(max(s, 0.0), 1.0 / 3.0);\n  return vec3(\n    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,\n    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,\n    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);\n}\nvec3 oklabToLin(vec3 c) {\n  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;\n  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;\n  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;\n  l = l * l * l; m = m * m * m; s = s * s * s;\n  return vec3(\n    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,\n    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,\n    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);\n}\nvec3 mixColour(vec3 a, vec3 b, float t) {\n  if (u_oklab > 0.5) {\n    vec3 la = linToOklab(srgbToLinear(a));\n    vec3 lb = linToOklab(srgbToLinear(b));\n    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);\n  }\n  return mix(a, b, t);\n}\n\n// Mix through the recipe colours; x is clamped to 0..1. WebGL1 forbids\n// dynamic uniform indexing in fragment shaders, hence the constant loop.\nvec3 palette(float x) {\n  float n = max(u_colorCount - 1.0, 1.0);\n  float f = clamp(x, 0.0, 1.0) * n;\n  vec3 col = u_colors[0];\n  for (int i = 0; i < 7; i++) {\n    if (float(i) < n)\n      col = mixColour(col, u_colors[i + 1],\n        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));\n  }\n  return col;\n}\n\nvec3 hueRotate(vec3 col, float a) {\n  const mat3 toYIQ = mat3(0.299, 0.596, 0.211,\n                          0.587, -0.274, -0.523,\n                          0.114, -0.322, 0.312);\n  const mat3 toRGB = mat3(1.0, 1.0, 1.0,\n                          0.956, -0.272, -1.106,\n                          0.621, -0.647, 1.703);\n  vec3 yiq = toYIQ * col;\n  float ca = cos(a), sa = sin(a);\n  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);\n  return toRGB * yiq;\n}\n\nvec3 shade(vec2 uv, vec2 p, float t) {\n  float y = uv.y\n    + sin(uv.x * (3.0 + u_intensity * 9.0) + t * 0.8) * 0.08\n    + (fbm(p * 2.0 + t * 0.1) - 0.5) * u_intensity * 0.6;\n  vec3 base = palette(y); float topGlow = 1.0 - smoothstep(0.0, 0.48, 1.0 - y); return mix(base, u_colors[0], topGlow * 0.22);\n}\n\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n  vec2 screenUv = uv;\n  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)\n    / min(u_resolution.x, u_resolution.y);\n  float cursorMask = 0.0;\n\n  // Cursor modes 1\u20133 are local distortions. Push shifts the same screen-space\n  // coordinates before field transforms, so Zoom/Rotate don't change its feel.\n  if (u_cursorPresence > 0.001) {\n    // u_mouse is normalized to -1..1 in canvas space. Convert it to the same\n    // aspect-corrected screen space as p so effects stay under the cursor.\n    vec2 cursor = (0.5 * u_mouse * u_resolution.xy)\n      / min(u_resolution.x, u_resolution.y);\n    vec2 cursorDelta = p - cursor;\n    if (u_cursorEffect < 0.5) {\n      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;\n    } else {\n      float cursorDistance = length(cursorDelta);\n      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);\n      cursorMask = u_cursorPresence\n        * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));\n      if (u_cursorEffect < 1.5) {\n        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;\n      } else if (u_cursorEffect < 2.5) {\n        float cursorAngle = cursorMask * u_cursorStrength * 2.2;\n        float cc = cos(cursorAngle), cs = sin(cursorAngle);\n        p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;\n      } else if (u_cursorEffect < 3.5) {\n        float ripple = sin(\n          cursorDistance / max(u_cursorRadius, 0.001) * 18.0 - u_time * 5.0);\n        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;\n      }\n    }\n  }\n\n  // Keep presets that read uv (rather than p) in the same warped space.\n  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;\n  p *= u_scale;\n  // Field transform: rotate, pan, pointer push, slow drift.\n  if (abs(u_rotate) > 0.0001) {\n    float cr = cos(u_rotate), sr = sin(u_rotate);\n    p = mat2(cr, -sr, sr, cr) * p;\n  }\n  p += u_offset;\n  if (u_drift > 0.0001)\n    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));\n  // Organic domain warp.\n  if (u_warp > 0.0) {\n    p += u_warp * (vec2(\n      fbm(p * u_detail + u_seed),\n      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);\n  }\n  // Shade, with an optional soft 5-tap blur.\n  vec3 col;\n  if (u_blur > 0.0) {\n    float e = u_blur;\n    float pe = e * u_scale;\n    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;\n    col  = shade(uv, p, u_time) * 0.36;\n    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;\n    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;\n    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;\n    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;\n  } else {\n    col = shade(uv, p, u_time);\n  }\n  // Post: contrast, saturation, hue, brightness, vignette, grain.\n  if (abs(u_contrast - 1.0) > 0.0001)\n    col = (col - 0.5) * u_contrast + 0.5;\n  if (abs(u_saturation - 1.0) > 0.0001) {\n    float luma = dot(col, vec3(0.299, 0.587, 0.114));\n    col = mix(vec3(luma), col, u_saturation);\n  }\n  if (abs(u_hue) > 0.0001)\n    col = hueRotate(col, u_hue);\n  if (abs(u_brightness) > 0.0001)\n    col += u_brightness;\n  if (u_vignette > 0.0001) {\n    float vd = length(screenUv - 0.5) * 1.41421356;\n    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);\n  }\n  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5)\n    col += (vec3(0.18) + col * 0.12) * cursorMask * u_cursorStrength;\n  if (u_grain > 0.0001)\n    col += (grainHash(\n      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;\n  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n}\n";
function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){throw new Error(gl.getShaderInfoLog(shader));}return shader;}
const program=gl.createProgram();
gl.attachShader(program,compile(gl.VERTEX_SHADER,VERT));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
const uniform=name=>gl.getUniformLocation(program,name);
const scene=uniform('u_scene');
gl.uniform3fv(uniform('u_colors[0]'),new Float32Array([1,.34117647,.16078431,...Array(7).fill([1,1,1]).flat()]));
gl.uniform4f(uniform('u_shape'),1.260,.350,.280,0);
gl.uniform4f(uniform('u_surface'),1.824,1.005,0,1);
gl.uniform4f(uniform('u_finish'),0,0,0,.042);
gl.uniform4f(uniform('u_transform'),8009,0,.032,1);
gl.uniform4f(uniform('u_space'),0,0,0,0);
gl.uniform4f(uniform('u_cursor'),0,3,.350,.616);
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const start=performance.now();let frame=0;let visible=true;
function draw(now){frame=0;if(!root.isConnected||!visible||document.hidden)return;const bounds=root.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,1.5);const w=Math.max(1,Math.round(bounds.width*dpr)),h=Math.max(1,Math.round(bounds.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}gl.uniform4f(scene,w,h,reduce.matches?0:(now-start)/1000*6.0,3);gl.drawArrays(gl.TRIANGLES,0,3);if(!reduce.matches)frame=requestAnimationFrame(draw);}
function resume(){if(!frame)frame=requestAnimationFrame(draw);}
new ResizeObserver(resume).observe(root);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();else{cancelAnimationFrame(frame);frame=0;}}).observe(root);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else resume();});
reduce.addEventListener('change',resume);resume();
})();
