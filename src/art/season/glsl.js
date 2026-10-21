// GLSL for the season / wet patches (art-c). Names are s-prefixed so they never clash with paint()/inkRim()/windify().
export const S_VERT_HEAD = `uniform vec4 uSeason; uniform vec3 uPC; varying vec3 vSWP; varying vec3 vSUp; varying float vSH;\n`
// after <project_vertex>: world position, planet-up in view space, per-instance hash
export const S_VERT_POS = `{ vec4 sw = vec4(transformed, 1.);
#ifdef USE_INSTANCING
  sw = instanceMatrix * sw; vSH = fract(sin(dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
#else
  vSH = .5;
#endif
  sw = modelMatrix * sw; vSWP = sw.xyz; vSUp = normalize(mat3(viewMatrix) * normalize(sw.xyz - uPC)); }\n`
// flowers fold away in winter and shrink to seed heads in autumn (no geometry change: the instance just scales)
export const S_SCALE = {
  flower: `transformed *= mix(1., .72, uSeason.z) * (1. - smoothstep(.15, .85, uSeason.w));\n`,
  stem: `transformed *= mix(1., .9, uSeason.z) * (1. - smoothstep(.15, .85, uSeason.w));\n`,
}
export const S_FRAG_HEAD = `uniform vec4 uSeason; uniform float uSnow, uWet, uSDay; uniform vec3 uSky, uSunV; varying vec3 vSWP; varying vec3 vSUp; varying float vSH;
float sH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float sN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(mix(sH(i), sH(i+vec3(1,0,0)), f.x), mix(sH(i+vec3(0,1,0)), sH(i+vec3(1,1,0)), f.x), f.y), mix(mix(sH(i+vec3(0,0,1)), sH(i+vec3(1,0,1)), f.x), mix(sH(i+vec3(0,1,1)), sH(i+vec3(1,1,1)), f.x), f.y), f.z); }
float sLum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
vec3 sSat(vec3 c, float s){ return mix(vec3(sLum(c)), c, s); }
// greens: spring fresh + light, summer deep + lush, autumn gold/straw, winter pale dry
vec3 sGreen(vec3 c){ float l = sLum(c);
  vec3 sp = sSat(c * vec3(1.06, 1.08, .82), 1.) + vec3(.04, .04, 0.);
  vec3 su = sSat(c * vec3(.8, .93, .8), 1.3);
  vec3 au = mix(c * vec3(.95, .9, .75), l * vec3(1.55, 1.12, .52), .6);
  vec3 wi = mix(c, l * vec3(1.14, 1.08, .94), .8);
  return sp*uSeason.x + su*uSeason.y + au*uSeason.z + wi*uSeason.w; }
// deciduous crowns: ~28% sakura pink in spring; autumn orange / crimson / gold / olive per instance; winter bare grey-brown
vec3 sLeaf(vec3 c, float h){ float l = sLum(c);
  vec3 sak = mix(vec3(1., .74, .84), vec3(1., .9, .94), smoothstep(.3, .75, l)) * (.72 + l * .5);
  vec3 sp = mix(sSat(c * vec3(1.06, 1.08, .84), 1.04) + vec3(.03, .035, 0.), sak, step(h, .34));
  vec3 su = sSat(c * vec3(.8, .92, .8), 1.3);
  vec3 ap = h < .3 ? vec3(.96, .52, .2) : h < .5 ? vec3(.86, .3, .24) : h < .82 ? vec3(.97, .74, .26) : vec3(.66, .64, .3);
  vec3 au = mix(c, ap * (.45 + l * 1.2), .88);
  vec3 wi = mix(c, vec3(.64, .57, .52) * (.5 + l * .8), .82);
  return sp*uSeason.x + su*uSeason.y + au*uSeason.z + wi*uSeason.w; }
// evergreens (firs, camphors, the giant tree): stay green, a little darker and bluer in winter
vec3 sEver(vec3 c){ vec3 su = sSat(c * vec3(.92, .98, .92), 1.1), au = c * vec3(.97, .95, .88), wi = sSat(c * vec3(.82, .9, .98), .82);
  return c*uSeason.x + su*uSeason.y + au*uSeason.z + wi*uSeason.w; }
vec3 sFlower(vec3 c, float h){ vec3 sp = mix(c, vec3(1., .84, .9), .4), su = sSat(c, 1.3), au = mix(c, mix(vec3(.88, .56, .26), vec3(.76, .36, .3), h), .72);
  return sp*uSeason.x + su*uSeason.y + au*uSeason.z + c*uSeason.w; }
// snow on upward-facing surfaces (planet up), soft broken edge
float sCap(float k0, float k1){ float up = dot(normalize(vNormal), normalize(vSUp)); float n = sN(vSWP * 3.1) * .6 + sN(vSWP * 9.7) * .4;
  return smoothstep(k0, k1, up + (n - .5) * .45) * uSnow; }
const vec3 S_SNOW = vec3(.93, .95, .99);
`
// after <color_fragment>. sSnowF / sWetF are declared at the top of main()
export const S_FRAG_COLOR = {
  ground: `{ vec3 c = diffuseColor.rgb;
    float gr = smoothstep(.015, .1, c.g - max(c.r, c.b)), wb = smoothstep(.04, .14, c.b - c.r), sand = smoothstep(.03, .12, c.r - c.g);
    c = mix(c, sGreen(c), gr);
#ifdef S_CAP
    sSnowF = sCap(.3, .62) * (1. - wb) * (1. - .55 * sand) * smoothstep(.3, .62, sN(vSWP * 1.3) * .7 + sN(vSWP * 4.1) * .3 + .1);
    c = mix(c, S_SNOW, sSnowF);
#else
    c = mix(c, sSat(c, .55) * vec3(1.02, 1.04, 1.1) + .12, uSnow * .55 * (1. - wb));
#endif
    diffuseColor.rgb = c; sWetF *= 1. - wb; }\n`,
  grass: `{ vec3 c = sGreen(diffuseColor.rgb);
#ifdef S_CAP
    sSnowF = sCap(.35, .75) * (.55 + .4 * vSH); c = mix(c, S_SNOW, sSnowF);
#else
    c = mix(c, c * .6 + vec3(.36, .38, .42), uSnow * .5);
#endif
    diffuseColor.rgb = c; }\n`,
  leaf: `{ vec3 c = sLeaf(diffuseColor.rgb, vSH);
#ifdef S_CAP
    sSnowF = sCap(.2, .6); c = mix(c, S_SNOW, sSnowF);
#else
    c = mix(c, c * .7 + vec3(.28, .3, .34), uSnow * .4);
#endif
    diffuseColor.rgb = c; }\n`,
  ever: `{ vec3 c = sEver(diffuseColor.rgb);
#ifdef S_CAP
    sSnowF = sCap(.25, .62); c = mix(c, S_SNOW, sSnowF);
#else
    c = mix(c, c * .8 + vec3(.2, .22, .26), uSnow * .35);
#endif
    diffuseColor.rgb = c; }\n`,
  flower: `diffuseColor.rgb = sFlower(diffuseColor.rgb, vSH);\n`,
  stem: `diffuseColor.rgb = mix(diffuseColor.rgb, sGreen(diffuseColor.rgb), .9);\n`,
  roof: `{
#ifdef S_CAP
    sSnowF = sCap(.35, .6); diffuseColor.rgb = mix(diffuseColor.rgb, S_SNOW, sSnowF);
#else
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .85 + .12, uSnow * .35);
#endif
  }\n`,
  cap: `{
#ifdef S_CAP
    sSnowF = sCap(.4, .7); diffuseColor.rgb = mix(diffuseColor.rgb, S_SNOW, sSnowF);
#endif
  }\n`,
}
// wet: darker + a touch more saturated (patchy), then a sky sheen at grazing angles + a small sun glint
export const S_WET_COLOR = `sWetF *= (1. - sSnowF) * (.72 + .28 * sN(vSWP * 1.7)); diffuseColor.rgb = sSat(diffuseColor.rgb * mix(1., .68, sWetF), 1. + .18 * sWetF);\n`
export const S_WET_SHEEN = `{ vec3 sNv = normalize(vNormal), sV = normalize(vViewPosition); float ndv = clamp(dot(sNv, sV), 0., 1.);
    float fr = pow(1. - ndv, 4.), sp = pow(max(dot(reflect(-sV, sNv), normalize(uSunV)), 0.), 90.);
    gl_FragColor.rgb += sWetF * (fr * uSky * .38 + sp * vec3(1., .95, .85) * .7 * uSDay); }\n`
