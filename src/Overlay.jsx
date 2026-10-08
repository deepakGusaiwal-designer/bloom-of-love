import React from 'react'
import LoveCalculator from './LoveCalculator.jsx'

function SplitChars({ text, className = 'char' }) {
  const words = text.split(' ')
  return (
    <span aria-label={text}>
      {words.map((word, wIdx) => {
        const isLove = /^love$/i.test(word)
        return (
          <React.Fragment key={wIdx}>
            {Array.from(word).map((ch, cIdx) => (
              <span
                key={`${wIdx}-${cIdx}`}
                className={isLove ? `${className} love-gloss` : className}
                data-text={ch}
                aria-hidden="true"
                style={{ display: 'inline-block' }}
              >
                {ch}
              </span>
            ))}
            {wIdx < words.length - 1 && (
              <span
                className={className}
                aria-hidden="true"
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
              >
                {' '}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </span>
  )
}

function SplitWords({ text, className = 'word', maskClass = 'word-mask' }) {
  const words = text.split(' ')
  const isTitle = className.includes('title-word')
  return (
    <span aria-label={text}>
      {words.map((word, i) => {
        const isLoveWord = /^["“'‘]?love[.,!?;:"”'’]*$/i.test(word)
        const finalClass = isLoveWord ? `${className} love-gloss` : className
        return (
          <React.Fragment key={i}>
            <span className={maskClass} aria-hidden="true">
              {isTitle && <span className="title-stroke">{word}</span>}
              <span className={finalClass} data-text={word}>
                {word}
              </span>
              {isTitle && <span className="title-shine">{word}</span>}
              {isTitle && <span className="ink-nib" />}
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        )
      })}
    </span>
  )
}

export default function Overlay() {
  return (
    <main className="overlay">
      {/* Hero */}
      <section className="act hero center">
        <div className="inner reveal">
          <p className="eyebrow">
            <SplitChars text="A love story in five acts" />
          </p>
          <h1>
            <SplitWords text="Forever" className="title-word" />{' '}
            <em>
              <SplitWords text="in Bloom" className="title-word" />
            </em>
          </h1>
          <p className="sub">
            <SplitWords
              text="Some feelings don’t need words. They bloom."
              className="sub-word"
              maskClass="sub-mask"
            />
          </p>
          <p className="hero-verse">
            <SplitWords
              text="In the quiet dark, a single spark of affection is enough to awaken a thousand petals."
              className="body-word"
              maskClass="body-mask"
            />
          </p>
        </div>
        <div className="scroll-hint" aria-hidden="true">
          <span>Scroll Down</span>
          <div className="line" />
        </div>
      </section>

      {/* Act I — A Seed of Feeling */}
      <section className="act">
        <div className="inner reveal">
          <p className="eyebrow">
            <SplitChars text="I · A seed of feeling" />
          </p>
          <h2>
            <SplitWords text="Every heartbeat begins in quiet" className="title-word" />
          </h2>
          <p className="body">
            <SplitWords
              text="Love isn’t loud. It begins as a gentle whisper — a lingering glance, a shared silence, a warmth that takes root in the soul long before you know its name."
              className="body-word"
              maskClass="body-mask"
            />
          </p>
          <p className="love-note">
            <SplitWords
              text="“Before I knew how to hold your hand, my heart already knew the rhythm of yours.”"
              className="note-word"
              maskClass="note-mask"
            />
          </p>
        </div>
      </section>

      {/* Act II — Love Awakens */}
      <section className="act right">
        <div className="inner reveal">
          <p className="eyebrow">
            <SplitChars text="II · Love awakens" />
          </p>
          <h2>
            <SplitWords text="Time makes devotion beautiful" className="title-word" />
          </h2>
          <p className="body">
            <SplitWords
              text="The deepest love is never rushed. Like a rose reaching toward unseen light, we learn to trust one another — unfolding petal by petal, guard by guard, until nothing is hidden."
              className="body-word"
              maskClass="body-mask"
            />
          </p>
          <p className="love-note">
            <SplitWords
              text="“With every sunrise, I find a hundred quiet new reasons to fall for you all over again.”"
              className="note-word"
              maskClass="note-mask"
            />
          </p>
        </div>
      </section>

      {/* Act III — Bloom */}
      <section className="act" aria-label="Bloom">
        <div className="inner reveal">
          <p className="eyebrow">
            <SplitChars text="III · Full bloom" />
          </p>
          <h2>
            <SplitWords text="When two hearts open as one" className="title-word" />
          </h2>
          <p className="body">
            <SplitWords
              text="Here, in the fullness of what we have become, vulnerability turns into grace. Every storm we weathered and every thorn along the stem only taught us how to bloom more brightly together."
              className="body-word"
              maskClass="body-mask"
            />
          </p>
          <div className="love-tags">
            <span className="tag-item">Unconditional</span>
            <span className="dot tag-item">·</span>
            <span className="tag-item">Tender</span>
            <span className="dot tag-item">·</span>
            <span className="tag-item">Wholehearted</span>
          </div>
        </div>
      </section>

      {/* Act IV — Blush · the quote arrives at full bloom */}
      <section className="act right">
        <div className="inner reveal">
          <p className="eyebrow">
            <SplitChars text="IV · The blush of devotion" />
          </p>
          <blockquote>
            <SplitWords
              text="“Love is composed of a single soul inhabiting two bodies.”"
              className="quote-word"
              maskClass="quote-mask"
            />
          </blockquote>
          <cite className="quote-cite">Aristotle</cite>
          <p className="body">
            <SplitWords
              text="To love you is to find magic in ordinary moments — to know that wherever life carries us, my home will always be the space right beside you."
              className="body-word"
              maskClass="body-mask"
            />
          </p>
        </div>
      </section>

      {/* Act V — Eternal Love & Couple Love Calculator */}
      <section className="act center finale">
        <div className="inner reveal">
          <p className="eyebrow">
            <SplitChars text="V · Eternal love" />
          </p>
          <h2>
            <SplitWords text="And still… our love blooms." className="title-word" />
          </h2>
          <p className="body center-body">
            <SplitWords
              text="Seasons will change and years will softly pass, yet what we have grown will never fade. Today, tomorrow, and for every lifetime after — my heart belongs to you."
              className="body-word"
              maskClass="body-mask"
            />
          </p>
          <p className="signature">
            <span className="sig-text">Always &amp; Forever</span>{' '}
            <span className="sig-heart">♥</span>
          </p>
        </div>

        <LoveCalculator />
      </section>
    </main>
  )
}

