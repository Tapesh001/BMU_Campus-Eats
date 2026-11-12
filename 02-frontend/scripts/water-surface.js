// A coarse height field drives optical refraction; the actual controls keep their layout.
class WaterSurface extends HTMLElement {
  connectedCallback() {
    const scene = this.querySelector(".home");
    if (!scene) return;
    this.style.display = "block";
    this.style.position = "relative";
    const controller = new AbortController();
    this.controller = controller;
    const events = { passive: true, signal: controller.signal };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // SVG samples the live page, so text, artwork and newly rendered buttons share one surface.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.innerHTML = `<defs><filter id="campus-refraction" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="surface"/>
      <feDisplacementMap in="SourceGraphic" in2="surface" scale="3.6" xChannelSelector="R" yChannelSelector="G" result="refracted"/>
      <feColorMatrix in="surface" values="0 0 0 0 1   0 0 0 0 0.89   0 0 0 0 0.68   0 0 0.042 0 0" result="glint"/>
      <feComposite in="glint" in2="refracted" operator="over"/>
    </filter></defs>`;
    this.append(svg);
    const map = svg.querySelector("feImage");
    let current, previous, pixels, cols, rows, lastPoint;
    let frame = 0, lastDraw = 0, lastInput = 0;
    function settle() {
      cancelAnimationFrame(frame);
      frame = 0; lastDraw = 0; lastPoint = null;
      scene.style.removeProperty("filter");
      current?.fill(0); previous?.fill(0);
    }
    function prepare(rect) {
      const cell = Math.max(5, rect.width / 240, rect.height / 560);
      const w = Math.ceil(rect.width / cell), h = Math.ceil(rect.height / cell);
      if (w === cols && h === rows) return;
      settle();
      canvas.width = cols = w; canvas.height = rows = h;
      current = new Float32Array(w*h); previous = new Float32Array(w*h);
      pixels = ctx.createImageData(w,h);
      for (let i=0;i<pixels.data.length;i+=4) {
        pixels.data[i]=pixels.data[i+1]=128; pixels.data[i+3]=255;
      }
    }
    function step() {
      for (let y=1;y<rows-1;y++) {
        for (let i=y*cols+1,end=(y+1)*cols-1;i<end;i++) {
          const laplacian=current[i-1]+current[i+1]+current[i-cols]+current[i+cols]-4*current[i];
          previous[i]=current[i]+0.968*(current[i]-previous[i])+0.46*laplacian;
        }
      }
      [previous,current]=[current,previous];
    }
    function draw(now) {
      if (now-lastInput>1500 || motion.matches || document.hidden) {settle();return;}
      // Bound work and simulation speed independently of high-refresh displays.
      if (!lastDraw || now-lastDraw>=30) {
        step();step();lastDraw=now;
        const rgba=pixels.data;
        for (let y=1;y<rows-1;y++) for(let i=y*cols+1,end=(y+1)*cols-1;i<end;i++) {
          const dx=current[i-1]-current[i+1], dy=current[i-cols]-current[i+cols];
          rgba[i*4]=128+dx*105; rgba[i*4+1]=128+dy*105;
          rgba[i*4+2]=Math.max(0,(dx*0.65+dy*0.76)*110);
        }
        ctx.putImageData(pixels,0,0);
        map.setAttribute("href",canvas.toDataURL());
        scene.style.filter="url(#campus-refraction)";
      }
      frame=requestAnimationFrame(draw);
    }
    function disturb(e,click) {
      if(motion.matches || document.hidden) return;
      const rect=scene.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      prepare(rect);
      const x=(e.clientX-rect.left)*cols/rect.width, y=(e.clientY-rect.top)*rows/rect.height;
      const now=performance.now();
      const from=(!click && lastPoint && now-lastInput<120) ? lastPoint : {x,y};
      const distance=Math.hypot(x-from.x,y-from.y);
      const count=Math.min(36,Math.max(1,Math.ceil(distance/1.5)));
      const radius=click?4.8:2.8;
      for(let n=1;n<=count;n++) {
        const cx=from.x+(x-from.x)*n/count, cy=from.y+(y-from.y)*n/count;
        for(let iy=Math.max(1,Math.floor(cy-radius));iy<=Math.min(rows-2,cy+radius);iy++)
          for(let ix=Math.max(1,Math.floor(cx-radius));ix<=Math.min(cols-2,cx+radius);ix++) {
            const falloff=1-((cx-ix)**2+(cy-iy)**2)/(radius*radius);
            if(falloff>0) {
              const i=iy*cols+ix;
              current[i]=Math.min(3,current[i]+falloff*falloff*(click?2.3:0.48));
            }
          }
      }
      lastPoint={x,y};lastInput=now;
      if(!frame)frame=requestAnimationFrame(draw);
    }
    this.addEventListener("pointermove",e=>disturb(e,false),events);
    this.addEventListener("pointerleave",()=>{lastPoint=null;},events);
    this.addEventListener("click",e=>{if(e.detail)disturb(e,true);},events);
    motion.addEventListener("change",settle,events);
    document.addEventListener("visibilitychange",settle,events);
    controller.signal.addEventListener("abort",()=>{settle();svg.remove();});
  }
  disconnectedCallback() { this.controller?.abort(); }
}
customElements.define("water-surface",WaterSurface);
