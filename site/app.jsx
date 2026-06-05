// app.jsx — monta o site, idioma e Tweaks
const { useState: useS, useEffect: useE } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroStyle": "terminal",
  "accent": "#3B82F6",
  "neon": true
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [lang, setLangState] = useS(() => localStorage.getItem("vt_lang") || "pt");
  const setLang = (l) => { setLangState(l); localStorage.setItem("vt_lang", l); };
  const t = I18N[lang];

  // aplica accent + neon como variáveis CSS no root
  useE(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent", tw.accent);
    r.style.setProperty("--neon", tw.neon ? "1" : "0");
    r.setAttribute("data-neon", tw.neon ? "on" : "off");
  }, [tw.accent, tw.neon]);

  useE(() => { document.documentElement.lang = lang === "pt" ? "pt-BR" : "en"; }, [lang]);

  return (
    <div id="topo" className="site">
      <Nav t={t} lang={lang} setLang={setLang} />
      <Hero variant={tw.heroStyle} t={t} />
      <Marquee items={t.marquee} />
      <Services t={t} />
      <Process t={t} />
      <Stack t={t} />
      <Work t={t} />
      <About t={t} />
      <Testimonials t={t} />
      <FAQ t={t} />
      <Contact t={t} />
      <Footer t={t} lang={lang} setLang={setLang} />

      <TweaksPanel>
        <TweakSection label={lang === "pt" ? "Versão do início (hero)" : "Hero version"} />
        <TweakRadio
          label={lang === "pt" ? "Estilo" : "Style"}
          value={tw.heroStyle}
          options={["terminal", "statement", "showcase"]}
          onChange={(v) => setTweak("heroStyle", v)}
        />
        <TweakSection label={lang === "pt" ? "Cor de destaque" : "Accent color"} />
        <TweakColor
          label="Accent"
          value={tw.accent}
          options={["#3B82F6", "#22D3EE", "#7C5CFF", "#19C37D", "#F472B6"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakToggle
          label={lang === "pt" ? "Brilho neon" : "Neon glow"}
          value={tw.neon}
          onChange={(v) => setTweak("neon", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
