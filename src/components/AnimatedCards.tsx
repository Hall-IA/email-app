'use client';

import { Mail, Check, CheckCircle, Info, X, Brain, Pencil, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

export default function AnimatedCards() {
  return (
    <section className="flex flex-row flex-wrap justify-center gap-4">
      {/* Élément 1 */}
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />

        {/* Enveloppes en haut */}
        <div className="absolute top-21 right-0 left-0 flex items-center justify-center gap-3 px-6">
          {/* Barre de progression */}
          <div className="absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 bg-white/30" />

          {/* Enveloppe 1 - Position centrale (en scan) puis sort */}
          <motion.div
            className="absolute z-10"
            initial={{ x: 0, opacity: 1 }}
            animate={{
              x: [0, 0, 0, 0, 76, 200],
              opacity: [1, 1, 1, 1, 1, 1],
            }}
            transition={{
              duration: 4,
              times: [0, 0.2, 0.5, 0.6, 0.75, 0.95],
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <motion.div
              className="relative flex h-14 w-16 items-center justify-center overflow-hidden rounded-lg shadow-lg"
              animate={{
                background: [
                  'rgb(255, 255, 255)',
                  'rgb(255, 255, 255)',
                  'rgb(255, 255, 255)',
                  'linear-gradient(to bottom right, rgb(251, 146, 60), rgb(249, 115, 22))',
                  'linear-gradient(to bottom right, rgb(251, 146, 60), rgb(249, 115, 22))',
                  'linear-gradient(to bottom right, rgb(251, 146, 60), rgb(249, 115, 22))',
                ],
              }}
              transition={{
                duration: 4,
                times: [0, 0.2, 0.5, 0.6, 0.75, 0.95],
                repeat: Infinity,
              }}
            >
              {/* Barre horizontale de scan qui descend */}
              <motion.div
                className="absolute right-0 left-0 z-20 h-2"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent, rgba(251,146,60,0.8), rgba(249,115,22,1), rgba(251,146,60,0.8), transparent)',
                  boxShadow: '0 0 20px 4px rgba(249,115,22,0.8)',
                  filter: 'blur(0.5px)',
                }}
                animate={{
                  top: ['-10%', '-10%', '110%', '110%', '110%', '110%'],
                  opacity: [0, 1, 1, 0, 0, 0],
                }}
                transition={{
                  duration: 4,
                  times: [0, 0.25, 0.5, 0.55, 0.75, 0.95],
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <motion.div
                animate={{
                  color: ['#9CA3AF', '#9CA3AF', '#9CA3AF', '#FFFFFF', '#FFFFFF', '#FFFFFF'],
                }}
                transition={{
                  duration: 4,
                  times: [0, 0.2, 0.5, 0.6, 0.75, 0.95],
                  repeat: Infinity,
                }}
              >
                <Mail className="relative z-10 h-7 w-7" strokeWidth={2} />
              </motion.div>
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shadow-md"
              animate={{ scale: [0, 0, 0, 1, 1, 1] }}
              transition={{
                duration: 4,
                times: [0, 0.2, 0.55, 0.6, 0.75, 0.95],
                repeat: Infinity,
                ease: 'backOut',
              }}
            >
              <Check className="h-2 w-2 text-white" strokeWidth={4} />
            </motion.div>
          </motion.div>

          {/* Enveloppe 2 - Attend derrière puis avance vers le centre */}
          <motion.div
            className="absolute z-10"
            initial={{ x: -76 }}
            animate={{
              x: [-76, -76, -76, -76, 0, 0],
            }}
            transition={{
              duration: 4,
              times: [0, 0.2, 0.5, 0.6, 0.75, 0.95],
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-white shadow-lg">
              <Mail className="h-7 w-7 text-gray-400" strokeWidth={2} />
            </div>
          </motion.div>

          {/* Enveloppe 3 - Attend encore plus loin puis avance */}
          <motion.div
            className="absolute z-10"
            initial={{ x: -152 }}
            animate={{
              x: [-152, -152, -152, -152, -76, -76],
            }}
            transition={{
              duration: 4,
              times: [0, 0.2, 0.5, 0.6, 0.75, 0.95],
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-white shadow-lg">
              <Mail className="h-7 w-7 text-gray-400" strokeWidth={2} />
            </div>
          </motion.div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="-mb-5 flex w-full items-end gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span
                className="font-roboto -mb-3 -ml-3 text-center text-[138px] leading-none font-black"
                style={{
                  background:
                    'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                1
              </span>
              <h2
                className="text-2xl leading-[30px] font-bold"
                style={{
                  color: 'var(--neoncarrot-50, #FFFEFD)',
                  fontFamily: 'var(--body-family, Roboto)',
                }}
              >
                Analyse d'email par l'IA
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Élément 2 */}
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />

        {/* Enveloppes avec catégories */}
        <div className="absolute top-7 right-0 left-0 ps-4">
          <div className="absolute top-14 right-40 left-0 h-0.5 -translate-y-1/2 bg-white/30" />
          <div className="relative flex items-center justify-between">
            {/* Groupe d'enveloppes à gauche */}
            <div className="flex gap-3">
              {/* Enveloppe 1 */}
              <div className="relative z-10">
                <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg">
                  <Mail className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shadow-md">
                  <Check className="h-2 w-2 text-white" strokeWidth={4} />
                </div>
              </div>

              {/* Enveloppe 2 */}
              <div className="relative z-10">
                <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg">
                  <Mail className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shadow-md">
                  <Check className="h-2 w-2 text-white" strokeWidth={4} />
                </div>
              </div>
            </div>

            {/* Badges à droite */}
            <div className="ml-[52px] flex w-full flex-col justify-end gap-3.5">
              {/* Badge Traité */}
              <div className="flex items-center gap-1.5 rounded-l-md bg-green-100 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-green-500 shadow-md">
                <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>Traité</span>
              </div>

              {/* Badge Info */}
              <div className="flex items-center gap-1.5 rounded-l-md bg-blue-100 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-blue-500 shadow-md">
                <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>Info</span>
              </div>

              {/* Badge Pub */}
              <div className="flex items-center gap-1.5 rounded-l-md bg-red-100 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-red-500 shadow-md">
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>Pub</span>
              </div>
            </div>

            {/* Lignes diagonales de connexion */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ zIndex: 1 }}
            >
              {/* Ligne vers Traité */}
              <line
                x1="40%"
                y1="50%"
                x2="70%"
                y2="25%"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Ligne vers Info */}
              <line
                x1="40%"
                y1="50%"
                x2="70%"
                y2="50%"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Ligne vers Pub */}
              <line
                x1="40%"
                y1="50%"
                x2="70%"
                y2="75%"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            </svg>
          </div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="-mb-5 flex w-full items-end gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span
                className="font-roboto -mb-3 -ml-3 text-center text-[138px] leading-none font-black"
                style={{
                  background:
                    'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                2
              </span>
              <h2
                className="text-2xl leading-[30px] font-bold"
                style={{
                  color: 'var(--neoncarrot-50, #FFFEFD)',
                  fontFamily: 'var(--body-family, Roboto)',
                }}
              >
                Tri de l'email par catégories
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Élément 3 */}
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />

        {/* Enveloppes avec catégories */}
        <div className="absolute top-7 right-0 left-0">
          <div className="relative flex items-center justify-between">
            {/* Badges à droite */}
            <div className="flex w-1/6 flex-col gap-3.5">
              {/* Badge Traité */}
              <div className="flex items-center gap-1.5 bg-green-100 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-green-500 shadow-md">
                <CheckCircle className="h-3.5 w-3.5 opacity-0" strokeWidth={2.5} />
                <span className="opacity-0">Traité</span>
              </div>

              {/* Badge Info */}
              <div className="flex items-center gap-1.5 bg-blue-100 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-blue-500 shadow-md">
                <Info className="h-3.5 w-3.5 opacity-0" strokeWidth={2.5} />
                <span className="opacity-0">Info</span>
              </div>

              {/* Badge Pub */}
              <div className="flex items-center gap-1.5 bg-red-100 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-red-500 shadow-md">
                <X className="h-3.5 w-3.5 opacity-0" strokeWidth={2.5} />
                <span className="opacity-0">Pub</span>
              </div>
            </div>

            {/* Grande carte IA */}
            <div
              className="absolute left-1/2 flex h-[120px] w-[80%] -translate-x-1/2 items-center justify-center overflow-hidden rounded-sm border shadow-xl"
              style={{
                background: `conic-gradient(
                  from 195.77deg at 84.44% -1.66%,
                  #FE9736 0deg,
                  #F4664C 76.15deg,
                  #F97E41 197.31deg,
                  #E3AB8D 245.77deg,
                  #FE9736 360deg
                )`,
              }}
            >
              <div className="relative flex h-full items-center justify-center">
                <RefreshCw
                  className="text-silverchalice-50 absolute top-1/2 left-1/2 min-h-full w-auto -translate-x-1/2 -translate-y-1/2 scale-[1.3] animate-[spin_2.5s_linear_infinite] opacity-20"
                  strokeWidth={3}
                  style={{ zIndex: 1 }}
                />
                <div className="relative z-10 flex items-center gap-1 rounded-lg border-2 border-white/40 bg-white/10 p-3 shadow-xl backdrop-blur-sm">
                  <Brain className="h-7 w-7 text-white" strokeWidth={2} />
                  {/* Logo IA stylisé */}
                  <Image
                    src={'/assets/svg/hallia.svg'}
                    height={32}
                    width={32}
                    alt=""
                    className="shrink-0"
                  />
                </div>
              </div>
            </div>

            {/* Badge brouillon */}
            <div className="flex items-center gap-1.5 bg-gray-900 px-3 py-1.5 text-xs font-semibold whitespace-nowrap shadow-md">
              <Pencil className="h-6 w-6 opacity-0" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="-mb-5 flex w-full items-end gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span
                className="font-roboto -mb-3 -ml-3 text-center text-[138px] leading-none font-black"
                style={{
                  background:
                    'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                3
              </span>
              <h2
                className="text-2xl leading-[30px] font-bold"
                style={{
                  color: 'var(--neoncarrot-50, #FFFEFD)',
                  fontFamily: 'var(--body-family, Roboto)',
                }}
              >
                Réflexion IA autonome
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Élément 4 */}
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />

        {/* Champ Brouillons et Crayon */}
        <div className="absolute top-16 left-0 flex items-center gap-3">
          {/* Icône Crayon dans un carré noir */}
          <div className="flex items-center gap-2 rounded-r-md bg-gray-900 px-3 py-2 whitespace-nowrap text-white shadow-lg">
            <Pencil className="h-6 w-6" strokeWidth={2} />
            <span className="text-sm font-semibold">Brouillons</span>
          </div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="-mb-5 flex w-full items-end gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span
                className="font-roboto -mb-3 -ml-3 text-center text-[138px] leading-none font-black"
                style={{
                  background:
                    'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                4
              </span>
              <h2
                className="text-2xl leading-[30px] font-bold"
                style={{
                  color: 'var(--neoncarrot-50, #FFFEFD)',
                  fontFamily: 'var(--body-family, Roboto)',
                }}
              >
                Réponse adaptée générée
              </h2>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
