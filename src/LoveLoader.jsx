import React, { useState } from 'react'

/*
 * LoveLoader:
 * A simple, elegant, featherweight romantic text loader.
 * Every time the page refreshes, a new love quote is randomly selected from 56 timeless literary quotes.
 * Minimalist, fast, zero-overhead, and dissolves smoothly into the 3D rose experience once ready.
 */

const LOVE_QUOTES = [
  { text: "In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine.", author: "Maya Angelou" },
  { text: "I love you without knowing how, or when, or from where. I love you simply, without problems or pride.", author: "Pablo Neruda" },
  { text: "Whatever our souls are made of, his and mine are the same.", author: "Emily Brontë" },
  { text: "You are my heart, my life, my one and only thought.", author: "Arthur Conan Doyle" },
  { text: "If I had a flower for every time I thought of you, I could walk through my garden forever.", author: "Alfred Tennyson" },
  { text: "You have bewitched me, body and soul, and I love, I love, I love you.", author: "Jane Austen" },
  { text: "Love is composed of a single soul inhabiting two bodies.", author: "Aristotle" },
  { text: "Grow old along with me! The best is yet to be.", author: "Robert Browning" },
  { text: "I would rather spend one lifetime with you, than face all the ages of this world alone.", author: "J.R.R. Tolkien" },
  { text: "To love or have loved, that is enough. Ask nothing further. There is no other pearl to be found in the dark folds of life.", author: "Victor Hugo" },
  { text: "You are every reason, every hope, and every dream I've ever had.", author: "Nicholas Sparks" },
  { text: "When I saw you I fell in love, and you smiled because you knew.", author: "Arrigo Boito" },
  { text: "Yours is the light by which my spirit's born: you are my sun, my moon, and all my stars.", author: "E.E. Cummings" },
  { text: "My heart is, and always will be, yours.", author: "Jane Austen" },
  { text: "I swear I couldn't love you more than I do right now, and yet I know I will tomorrow.", author: "Leo Christopher" },
  { text: "If I know what love is, it is because of you.", author: "Hermann Hesse" },
  { text: "The best thing to hold onto in life is each other.", author: "Audrey Hepburn" },
  { text: "I look at you and I would rather look at you than all the portraits in the world.", author: "Frank O'Hara" },
  { text: "Two souls with but a single thought, two hearts that beat as one.", author: "Friedrich Halm" },
  { text: "You are my today and all of my tomorrows.", author: "Leo Christopher" },
  { text: "I fell in love the way you fall asleep: slowly, and then all at once.", author: "John Green" },
  { text: "You pierce my soul. I am half agony, half hope. Tell me not that I am too late.", author: "Jane Austen" },
  { text: "I have found the one whom my soul loves.", author: "Song of Solomon" },
  { text: "Doubt thou the stars are fire, doubt that the sun doth move, doubt truth to be a liar, but never doubt I love.", author: "William Shakespeare" },
  { text: "In your smile, I see something more beautiful than the stars.", author: "Beth Revis" },
  { text: "Where there is love there is life.", author: "Mahatma Gandhi" },
  { text: "The water shines only by the sun. And it is you who are my sun.", author: "Charles de Leusse" },
  { text: "Each time you love, love as deeply as if it were forever.", author: "Audre Lorde" },
  { text: "We loved with a love that was more than love.", author: "Edgar Allan Poe" },
  { text: "To love is nothing. To be loved is something. But to love and be loved, that’s everything.", author: "T. Tolis" },
  { text: "I wish you to know that you have been the last dream of my soul.", author: "Charles Dickens" },
  { text: "My soul and your soul are forever tangled.", author: "N.R. Hart" },
  { text: "You make me want to be a better man.", author: "Melvin Udall" },
  { text: "For you see, each day I love you more, today more than yesterday and less than tomorrow.", author: "Rosemonde Gérard" },
  { text: "Love looks not with the eyes, but with the mind, and therefore is winged Cupid painted blind.", author: "William Shakespeare" },
  { text: "I desire to be with you. I miss you. I feel lonely when I cannot see you.", author: "Abraham Lincoln" },
  { text: "There is only one happiness in this life, to love and be loved.", author: "George Sand" },
  { text: "A flower cannot blossom without sunshine, and man cannot live without love.", author: "Max Müller" },
  { text: "I need you like a heart needs a beat.", author: "OneRepublic" },
  { text: "My heart will always be your home.", author: "Anonymous" },
  { text: "You are the finest, loveliest, tenderest, and most beautiful person I have ever known.", author: "F. Scott Fitzgerald" },
  { text: "I love you more than words can wield the matter, dearer than eyesight, space, and liberty.", author: "William Shakespeare" },
  { text: "Soul meets soul on lovers' lips.", author: "Percy Bysshe Shelley" },
  { text: "I loved you yesterday, love you still, always have, always will.", author: "Elaine Davis" },
  { text: "You are the poem I never knew how to write, and this life is the story I have always wanted to tell.", author: "Tyler Knott Gregson" },
  { text: "Take my hand, take my whole life too, for I can't help falling in love with you.", author: "Elvis Presley" },
  { text: "True love stories never have endings.", author: "Richard Bach" },
  { text: "If you live to be a hundred, I want to live to be a hundred minus one day so I never have to live without you.", author: "A.A. Milne" },
  { text: "You don't love someone for their looks, or their clothes, or for their fancy car, but because they sing a song only you can hear.", author: "Oscar Wilde" },
  { text: "Even before we met and long after we're gone, my heart belongs to yours.", author: "Anonymous" },
  { text: "Love was made for me and you.", author: "Nat King Cole" },
  { text: "With the whole world crumbling, we pick this time to fall in love.", author: "Casablanca" },
  { text: "You are the stillness in my storms and the dawn in my darkest night.", author: "Anonymous" },
  { text: "To the world you may be one person, but to one person you are the world.", author: "Bill Wilson" },
  { text: "Like a rose unfolding in the morning dew, every heartbeat opens just for you.", author: "Forever in Bloom" },
  { text: "Some feelings do not need words. They simply bloom.", author: "Forever in Bloom" },
]

const CATCHY_BUTTON_TEXTS = [
  "Step into Forever 🌹",
  "Enter the Bloom ✨🌹",
  "Begin Our Love Story 🌹",
  "Unfold the Magic 🌹",
  "Touch to Blossom 🌹",
  "Awaken My Heart 🌹",
  "Where Love Blooms 🌹",
  "Walk into Eternity 🌹",
]

export default function LoveLoader({ ready }) {
  const [mounted, setMounted] = useState(true)
  const [fading, setFading] = useState(false)

  const [quote] = useState(() => {
    const idx = Math.floor(Math.random() * LOVE_QUOTES.length)
    return LOVE_QUOTES[idx]
  })
  const [buttonText] = useState(() => {
    const idx = Math.floor(Math.random() * CATCHY_BUTTON_TEXTS.length)
    return CATCHY_BUTTON_TEXTS[idx]
  })

  // Handle Enter button click
  const handleEnterClick = (e) => {
    e?.stopPropagation?.()
    if (fading) return
    // Dispatch real user gesture to unlock Web Audio in LoveMelody
    window.dispatchEvent(new Event('pointerdown'))
    setFading(true)
    setTimeout(() => {
      setMounted(false)
    }, 900)
  }

  if (!mounted) return null

  return (
    <div
      className={`love-loader-screen ${fading ? 'loader-fading' : ''} ${ready ? 'loader-ready' : ''}`}
      role="status"
      aria-live="polite"
      onClick={ready ? handleEnterClick : undefined}
    >
      <div className="love-loader-backdrop-glow" />

      <div className="love-loader-content">
        <span className="love-loader-rose-icon" aria-hidden="true">
          🌹
        </span>

        <blockquote className="love-loader-quote">
          “{quote.text}”
        </blockquote>

        <cite className="love-loader-author">
          — {quote.author}
        </cite>

        <div className="love-loader-action">
          {ready ? (
            <button
              type="button"
              className="love-loader-enter-btn glass-btn"
              onClick={handleEnterClick}
              autoFocus
            >
              <span className="glass-reflection" />
              <span className="loader-btn-glow" />
              <span className="loader-btn-text">{buttonText}</span>
            </button>
          ) : (
            <div className="love-loader-waiting">
              <span className="waiting-pulse-dot" />
              <span className="waiting-label">Blossoming your rose…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


