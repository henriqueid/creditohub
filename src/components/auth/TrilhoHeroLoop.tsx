/**
 * Hero animado da marca Trilho — para uso no painel esquerdo do login.
 * Feito a partir do mockup em /logo/trilho-hero-loop.html.
 *
 * Camadas (de fundo pra topo):
 *   1. Gradientes radiais + linear no container
 *   2. Constelação de estrelas mint pulsando + linhas conectando
 *   3. Marca central: 2 rails + bolinha mint correndo + light sweep
 *   4. Wordmark "Trilho." centralizado
 *   5. Tagline "INTELIGÊNCIA PARA DECISÕES DE CRÉDITO"
 *   6. Vinheta sobre tudo
 */
export function TrilhoHeroLoop() {
  return (
    <div className="trilho-hero relative w-full h-full overflow-hidden">
      <style>{styles}</style>

      <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="railSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#00D49A" stopOpacity="0" />
            <stop offset="50%" stopColor="#00D49A" stopOpacity="1" />
            <stop offset="100%" stopColor="#00D49A" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="trailGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#00D49A" stopOpacity="0" />
            <stop offset="100%" stopColor="#00D49A" stopOpacity=".9" />
          </linearGradient>

          <filter id="ballGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
            <stop offset="60%" stopColor="#0A1538" stopOpacity="0" />
            <stop offset="100%" stopColor="#0A1538" stopOpacity=".55" />
          </radialGradient>
        </defs>

        {/* Constelações */}
        <g>
          <circle className="star s-1"  cx="1010" cy="120" r="2.2" />
          <circle className="star s-2"  cx="1080" cy="180" r="1.8" />
          <circle className="star s-3"  cx="1130" cy="240" r="2.4" />
          <circle className="star s-4"  cx="1075" cy="300" r="1.6" />
          <circle className="star s-5"  cx="1145" cy="360" r="2" />
          <circle className="star s-6"  cx="1090" cy="430" r="1.8" />
          <circle className="star s-7"  cx="1035" cy="490" r="2.2" />
          <polyline className="link l-1" points="1010,120 1080,180 1130,240 1075,300 1145,360 1090,430 1035,490" />

          <circle className="star s-8"  cx="430" cy="540" r="1.6" />
          <circle className="star s-9"  cx="500" cy="580" r="2" />
          <circle className="star s-10" cx="580" cy="555" r="1.8" />
          <circle className="star s-11" cx="650" cy="610" r="2.2" />
          <circle className="star s-12" cx="730" cy="565" r="1.8" />
          <polyline className="link l-2" points="430,540 500,580 580,555 650,610 730,565" />

          <circle className="star s-13" cx="120" cy="170" r="1.6" />
          <circle className="star s-14" cx="80"  cy="450" r="1.8" />
          <circle className="star s-1"  cx="180" cy="600" r="2" />
          <polyline className="link l-3" points="120,170 80,450 180,600" />

          <circle className="star s-2" cx="350" cy="110" r="1.6" />
          <circle className="star s-5" cx="900" cy="640" r="1.8" />
          <circle className="star s-9" cx="250" cy="320" r="1.6" />
          <circle className="star s-3" cx="970" cy="80"  r="1.8" />
          <polyline className="link l-4" points="350,110 250,320 80,450" />
        </g>

        {/* Marca central animada (rails + bolinha) */}
        <g transform="translate(600 320)">
          <g>
            <rect className="rail" x="-160" y="-22" width="320" height="10" rx="5" />
            <rect className="rail-glow" x="-160" y="-22" width="320" height="10" rx="5" />
            <rect className="rail" x="-160" y="12"  width="320" height="10" rx="5" />
            <rect className="rail-glow" x="-160" y="12"  width="320" height="10" rx="5" />
            <line className="horizon" x1="-220" y1="60" x2="220" y2="60" />
          </g>
          <ellipse className="ball-trail" cx="0" cy="-5" rx="40" ry="6" />
          <circle className="ball" cx="0" cy="-5" r="13" />
        </g>

        {/* Wordmark */}
        <text className="wordmark" x="600" y="455" textAnchor="middle" fontSize="86">
          Trilho<tspan className="dot">.</tspan>
        </text>

        {/* Tagline */}
        <text x="600" y="498" textAnchor="middle"
              fontFamily="Geist,Inter,system-ui,sans-serif"
              fontSize="13" fontWeight="400"
              letterSpacing="6" fill="#FAFAF7" opacity=".55">
          INTELIGÊNCIA  PARA  DECISÕES  DE  CRÉDITO
        </text>

        {/* Vinheta */}
        <rect x="0" y="0" width="1200" height="720" fill="url(#vignette)" pointerEvents="none" />
      </svg>
    </div>
  );
}

const styles = `
.trilho-hero {
  background:
    radial-gradient(80% 60% at 50% 38%, rgba(0,212,154,.07) 0%, rgba(0,212,154,0) 60%),
    radial-gradient(70% 50% at 78% 22%, rgba(0,212,154,.05) 0%, rgba(0,212,154,0) 55%),
    linear-gradient(180deg, #0A1538 0%, #0c1840 100%);
}
.trilho-hero svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

.trilho-hero .star {
  fill: #00D49A;
  transform-box: fill-box;
  transform-origin: center;
  animation: trilhoStarPulse 6s ease-in-out infinite;
}
@keyframes trilhoStarPulse {
  0%, 100% { opacity: .18; transform: scale(.8); }
  50%      { opacity: .65; transform: scale(1); }
}

.trilho-hero .link {
  stroke: #00D49A;
  stroke-width: .5;
  fill: none;
  opacity: 0;
  animation: trilhoLinkFade 8s ease-in-out infinite;
}
@keyframes trilhoLinkFade {
  0%, 100% { opacity: 0; }
  40%, 60% { opacity: .22; }
}

.trilho-hero .s-1 { animation-delay: -0.0s; }
.trilho-hero .s-2 { animation-delay: -1.2s; }
.trilho-hero .s-3 { animation-delay: -2.4s; }
.trilho-hero .s-4 { animation-delay: -3.6s; }
.trilho-hero .s-5 { animation-delay: -4.8s; }
.trilho-hero .s-6 { animation-delay: -0.6s; }
.trilho-hero .s-7 { animation-delay: -2.0s; }
.trilho-hero .s-8 { animation-delay: -3.0s; }
.trilho-hero .s-9 { animation-delay: -4.2s; }
.trilho-hero .s-10 { animation-delay: -1.5s; }
.trilho-hero .s-11 { animation-delay: -3.3s; }
.trilho-hero .s-12 { animation-delay: -5.1s; }
.trilho-hero .s-13 { animation-delay: -0.9s; }
.trilho-hero .s-14 { animation-delay: -2.7s; }
.trilho-hero .l-1 { animation-delay: -0.4s; }
.trilho-hero .l-2 { animation-delay: -2.8s; }
.trilho-hero .l-3 { animation-delay: -5.2s; }
.trilho-hero .l-4 { animation-delay: -1.6s; }

.trilho-hero .rail { fill: #FAFAF7; opacity: .92; }
.trilho-hero .rail-glow {
  fill: url(#railSweep);
  opacity: 0;
  animation: trilhoRailSweep 6s ease-in-out infinite;
}
@keyframes trilhoRailSweep {
  0%   { opacity: 0; transform: translateX(-30%); }
  20%  { opacity: .85; }
  80%  { opacity: .85; }
  100% { opacity: 0; transform: translateX(30%); }
}

.trilho-hero .ball {
  fill: #00D49A;
  filter: url(#ballGlow);
  animation: trilhoBallRun 6s ease-in-out infinite;
}
@keyframes trilhoBallRun {
  0%   { transform: translateX(-90px); }
  50%  { transform: translateX(90px); }
  100% { transform: translateX(-90px); }
}

.trilho-hero .ball-trail {
  fill: url(#trailGrad);
  opacity: .55;
  animation: trilhoTrailRun 6s ease-in-out infinite;
}
@keyframes trilhoTrailRun {
  0%   { transform: translateX(-90px) scaleX(.4); opacity: 0; }
  25%  { opacity: .5; }
  50%  { transform: translateX(90px)  scaleX(.4); opacity: 0; }
  75%  { opacity: .5; }
  100% { transform: translateX(-90px) scaleX(.4); opacity: 0; }
}

.trilho-hero .wordmark {
  font-family: 'Geist','Inter',system-ui,sans-serif;
  font-weight: 500;
  letter-spacing: -3.5px;
  fill: #FAFAF7;
  animation: trilhoWordBreathe 6s ease-in-out infinite;
}
.trilho-hero .wordmark .dot { fill: #00D49A; }
@keyframes trilhoWordBreathe {
  0%, 100% { opacity: .95; }
  50%      { opacity: 1; }
}

.trilho-hero .horizon { stroke: #00D49A; stroke-width: .4; opacity: .18; }

@media (prefers-reduced-motion: reduce) {
  .trilho-hero *, .trilho-hero .ball { animation: none !important; }
  .trilho-hero .ball { transform: translateX(0); }
  .trilho-hero .rail-glow { opacity: 0; }
}
`;
