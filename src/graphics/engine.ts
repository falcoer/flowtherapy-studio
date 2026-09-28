import { FONTS, type Project, type Renderer } from "./model.js";

const vertex = `
attribute vec2 a_uv;
uniform vec2 u_surface, u_center, u_size;
uniform float u_rotation;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  vec2 p = (a_uv - 0.5) * u_size;
  float c = cos(u_rotation), s = sin(u_rotation);
  p = vec2(c*p.x-s*p.y,s*p.x+c*p.y)+u_center;
  gl_Position = vec4(p.x/u_surface.x*2.0-1.0,1.0-p.y/u_surface.y*2.0,0.0,1.0);
}`;
const fragment = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform int u_mode;
uniform float u_time, u_opacity, u_hue, u_saturation, u_brightness, u_intensity;
uniform vec3 u_color;
void main() {
  vec2 p = v_uv - 0.5;
  vec4 c;
  if (u_mode == 0) { c = texture2D(u_texture, v_uv); c.rgb *= u_color; }
  else if (u_mode == 1) {
    float a = sin(p.x*5.0+p.y*3.0+u_time*0.6)*0.5+0.5;
    float b = sin(p.y*6.0-p.x*2.0-u_time*0.4)*0.5+0.5;
    vec3 col = mix(vec3(0.04,0.06,0.13),u_color,a*0.6);
    col = mix(col,vec3(0.94,0.40,0.28),pow(b,3.0)*0.6);
    c = vec4(col*u_intensity,1.0);
  } else if (u_mode == 2) {
    float pulse = 0.8+0.2*sin(u_time*1.5);
    float glow = exp(-dot(p,p)*12.0/pulse) * (1.0-smoothstep(0.3,0.5,length(p)));
    c = vec4(u_color,glow*u_intensity);
  } else {
    float wave = sin(p.x*16.0+sin(p.y*8.0+u_time)*2.0-u_time*1.4);
    float line = pow(0.5+0.5*wave,10.0);
    c = vec4(u_color,line*u_intensity*0.8);
  }
  vec3 axis = normalize(vec3(1.0));
  c.rgb = c.rgb*cos(u_hue)+cross(axis,c.rgb)*sin(u_hue)+axis*dot(axis,c.rgb)*(1.0-cos(u_hue));
  float l = dot(c.rgb,vec3(0.2126,0.7152,0.0722));
  c.rgb = clamp(mix(vec3(l),c.rgb,u_saturation)*u_brightness,0.0,1.0);
  c.a = clamp(c.a*u_opacity,0.0,1.0);
  gl_FragColor = vec4(c.rgb*c.a,c.a);
}`;
export function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}
let fontsReady: Promise<void> | undefined;
export function loadFonts() {
  return (fontsReady ??= (async () => {
    const urls = [
      new URL("../editor/site-fonts/Bangers-Regular.ttf", import.meta.url),
      new URL("../editor/site-fonts/Inter-Variable.ttf", import.meta.url),
      new URL("../editor/site-fonts/Kalam-Regular.ttf", import.meta.url),
    ];
    for (let i = 0; i < urls.length; i++) {
      const face = new FontFace(FONTS[i], `url("${urls[i].href}")`);
      await face.load();
      (document.fonts as FontFaceSet & { add(face: FontFace): void }).add(face);
    }
    await document.fonts.ready;
  })());
}
type TextureEntry = { key: string; texture: WebGLTexture };
export class GraphicEngine {
  readonly gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private white: WebGLTexture;
  private textures = new Map<string, TextureEntry>();
  private images = new Map<string, HTMLImageElement>();
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private disposed = false;
  readonly limit: number;
  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      antialias: true,
    });
    if (!gl)
      throw new Error(
        "WebGL indisponible. Activez l’accélération graphique du navigateur.",
      );
    this.gl = gl;
    this.limit = Math.min(
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      ...gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    );
    const compile = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(`Shader : ${log}`);
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex),
      fs = compile(gl.FRAGMENT_SHADER, fragment);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
      throw new Error(`WebGL : ${gl.getProgramInfoLog(this.program)}`);
    gl.useProgram(this.program);
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(this.program, "a_uv");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.white = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.white);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  private loc(name: string) {
    if (!this.uniforms.has(name))
      this.uniforms.set(name, this.gl.getUniformLocation(this.program, name));
    return this.uniforms.get(name)!;
  }
  async prepare(p: Project) {
    await loadFonts();
    for (const asset of p.assets) {
      if (this.images.get(asset.id)?.src === asset.dataUrl) continue;
      const img = new Image();
      img.src = asset.dataUrl;
      await img.decode();
      if (this.disposed) return;
      if (img.naturalWidth * img.naturalHeight > 40_000_000)
        throw new Error(
          `Image ${asset.name} trop grande (40 mégapixels maximum).`,
        );
      this.images.set(asset.id, img);
    }
    const ids = new Set(p.renderers.map((r) => r.id));
    for (const [id, entry] of this.textures)
      if (!ids.has(id)) {
        this.gl.deleteTexture(entry.texture);
        this.textures.delete(id);
      }
    const assets = new Set(p.assets.map((a) => a.id));
    for (const id of this.images.keys())
      if (!assets.has(id)) this.images.delete(id);
  }
  private texture(r: Renderer): WebGLTexture {
    const image = this.images.get(r.assetId);
    const key =
      r.kind === "image"
        ? `${r.assetId}:${image?.src}:${r.width}:${r.height}`
        : JSON.stringify([r.text, r.font, r.fontSize, r.width, r.height]);
    const cached = this.textures.get(r.id);
    if (cached?.key === key) return cached.texture;
    const c = document.createElement("canvas");
    const scale = Math.min(1, this.limit / r.width, this.limit / r.height);
    c.width = Math.max(1, Math.ceil(r.width * scale));
    c.height = Math.max(1, Math.ceil(r.height * scale));
    const ctx = c.getContext("2d")!;
    if (r.kind === "image") {
      if (!image) throw new Error(`Image absente pour ${r.name}.`);
      const s = Math.min(
        c.width / image.naturalWidth,
        c.height / image.naturalHeight,
      );
      ctx.drawImage(
        image,
        (c.width - image.naturalWidth * s) / 2,
        (c.height - image.naturalHeight * s) / 2,
        image.naturalWidth * s,
        image.naturalHeight * s,
      );
    } else {
      const lines = r.text.split("\n");
      const size = r.fontSize * scale;
      ctx.font = `${size}px "${r.font}"`;
      const widest = Math.max(
        1,
        ...lines.map((line) => ctx.measureText(line).width),
      );
      // All content remains visible. Explicit line breaks are preserved; fit never truncates.
      const fit = Math.min(
        1,
        (c.width * 0.96) / widest,
        (c.height * 0.9) / (Math.max(1, lines.length) * size * 1.15),
      );
      const actual = size * fit;
      ctx.font = `${actual}px "${r.font}"`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach((line, i) =>
        ctx.fillText(
          line,
          c.width / 2,
          c.height / 2 + (i - (lines.length - 1) / 2) * actual * 1.15,
        ),
      );
    }
    const gl = this.gl,
      texture = cached?.texture ?? gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.set(r.id, { key, texture });
    return texture;
  }
  render(
    p: Project,
    time: number,
    width = p.surface.width,
    height = p.surface.height,
  ) {
    if (this.disposed) throw new Error("Moteur fermé.");
    const gl = this.gl;
    if (gl.isContextLost())
      throw new Error(
        "Contexte WebGL perdu. Rechargez l’éditeur ; la sauvegarde locale reste disponible.",
      );
    if (width > this.limit || height > this.limit)
      throw new Error(
        `Surface trop grande pour ce GPU : limite ${this.limit}px. Choisissez une résolution plus petite.`,
      );
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(...(rgb(p.background) as [number, number, number]), 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform2f(this.loc("u_surface"), p.surface.width, p.surface.height);
    for (const r of [...p.renderers].sort((a, b) => a.z - b.z)) {
      const a = p.anchors.find((a) => a.id === r.anchorId);
      if (!a) throw new Error("Ancrage absent.");
      gl.uniform2f(
        this.loc("u_center"),
        a.x * p.surface.width + r.offsetX,
        a.y * p.surface.height + r.offsetY,
      );
      gl.uniform2f(this.loc("u_size"), r.width, r.height);
      for (const [key, value] of Object.entries({
        u_rotation: (r.rotation * Math.PI) / 180,
        u_time: time * r.speed,
        u_opacity: r.opacity,
        u_hue: (r.hue * Math.PI) / 180,
        u_saturation: r.saturation,
        u_brightness: r.brightness,
        u_intensity: r.intensity,
      }))
        gl.uniform1f(this.loc(key), value);
      gl.uniform3fv(this.loc("u_color"), rgb(r.color));
      gl.uniform1i(
        this.loc("u_mode"),
        r.kind === "shader" ? { aurora: 1, halo: 2, waves: 3 }[r.shader] : 0,
      );
      if (r.kind !== "shader") {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture(r));
        gl.uniform1i(this.loc("u_texture"), 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }
  dispose() {
    this.disposed = true;
    for (const t of this.textures.values()) this.gl.deleteTexture(t.texture);
    this.textures.clear();
    this.images.clear();
    this.gl.deleteTexture(this.white);
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
