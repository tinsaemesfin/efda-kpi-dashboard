// Run before paint so 110-150% browser zoom (or Windows display scaling) keeps the
// layout designed for a 100% / 1920px-wide canvas instead of enlarging everything.
// The root is scaled back toward 100%, `--app-zoom` lets viewport-unit sizes compensate,
// and `data-app-bp` lists the breakpoints the compensated canvas reaches (see globals.css).
// Zoom levels above 150% are left alone so larger magnification stays available.
export const ZOOM_DESIGN_WIDTH = 1920;

export const zoomBootstrap = `(function(){try{var r=document.documentElement,b=[['sm',640],['md',768],['lg',1024],['xl',1280],['2xl',1536]];function a(){var d=window.devicePixelRatio||1,w=window.innerWidth,z=1;if(d>1.05&&d<1.55&&w<${ZOOM_DESIGN_WIDTH})z=Math.min(1,Math.max(1/d,w/${ZOOM_DESIGN_WIDTH}));if(z>0.99){r.style.removeProperty('zoom');r.style.removeProperty('--app-zoom');r.removeAttribute('data-app-bp');return}var e=w/z,o=[];for(var i=0;i<b.length;i++)if(e>=b[i][1])o.push(b[i][0]);r.style.zoom=String(z);r.style.setProperty('--app-zoom',String(z));r.setAttribute('data-app-bp',o.join(' '))}a();window.addEventListener('resize',a)}catch(e){}})();`;
