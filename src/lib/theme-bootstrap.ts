// Run before paint so a saved dark preference does not flash a light page.
export const themeBootstrap = `(function(){try{var t=JSON.parse(localStorage.getItem('ui-storage')||'{}').state?.theme;var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})();`;

