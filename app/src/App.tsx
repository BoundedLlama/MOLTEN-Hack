import { useState } from 'react'
import PdfUpload from './components/PdfUpload'
import PracticeRoom from './xr/PracticeRoom'
import type { PosterFrame } from './poster/types'
import './App.css'

function App() {
  const [poster, setPoster] = useState<PosterFrame | null>(null)
  return (
    <>
      <header><a className="brand" href="./"><span className="brand-icon" aria-hidden="true">▱</span> MOLTEN<span className="brand-dot">.</span></a><span className="header-note"><i /> Your presentation workspace</span></header>
      <main>
        <div className="eyebrow">MAKE ROOM FOR YOUR NEXT BIG IDEA</div>
        <h1>Great presentations<br />start with practice<span>.</span></h1>
        <p className="intro">Bring your PDF. Take the first step toward your next presentation.</p>
        <PdfUpload onPosterReady={setPoster} onPosterClear={() => setPoster(null)}>
          {(navigation) => <PracticeRoom frame={poster} navigation={navigation} />}
        </PdfUpload>
        <div className="below"><span className="mini-icon" aria-hidden="true">↳</span><p>Your ideas. Your own pace.<br /><span>One presentation at a time.</span></p></div>
      </main>
      <footer><span>A little preparation. A lot more confidence.</span><span>MOLTEN <span className="spark" aria-hidden="true">✳</span></span></footer>
    </>
  )
}

export default App
