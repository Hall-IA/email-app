'use client';

import { Mail } from 'lucide-react';

export default function AnimatedCards() {
    return (
        <section className="flex flex-row flex-wrap gap-4">
            <div className="w-full sm:w-[280px] md:w-[300px] relative overflow-hidden">
                <img 
                    src="/assets/img/animated-card-bg.png" 
                    alt="Card background"
                    className="w-full h-full object-contain"
                />
                {/* Zone d'animation des enveloppes - en haut de la carte, au-dessus du "1" et du titre */}
                {/* <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
                    <div className="relative w-full h-full overflow-hidden">
                        <Mail 
                            className="envelope-slide-1 absolute w-17 h-17  text-white/90" 
                            style={{ 
                                top: '25%',
                                left: '0',
                            }}
                        />
                        <Mail 
                            className="envelope-slide-2 absolute w-17 h-17 text-white/90" 
                            style={{ 
                                top: '25%',
                                left: '0',
                            }}
                        />
                        <Mail 
                            className="envelope-slide-3 absolute w-17 h-17 text-white/90" 
                            style={{ 
                                top: '25%',
                                left: '0',
                            }}
                        />
                    </div>
                </div> */}
                <div className="absolute inset-0 flex items-end">
                    <div className="flex items-end gap-2 w-full -mb-5 pr-4">
                        <div className="flex items-center gap-2">
                            <span 
                                className="text-center text-[138px] font-black leading-none font-roboto -ml-3 -mb-3"
                                style={{
                                    background: 'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                1
                            </span>
                            <h2 
                                className="text-2xl font-bold leading-[30px]"
                                style={{
                                    color: 'var(--neoncarrot-50, #FFFEFD)',
                                    fontFamily: 'var(--body-family, Roboto)'
                                }}
                            >
                                Analyse d'email par l'IA
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full sm:w-[280px] md:w-[300px] relative overflow-hidden">
                <img 
                    src="/assets/img/animated-card-bg.png" 
                    alt="Card background"
                    className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-end">
                    <div className="flex items-end gap-2 w-full -mb-5 pr-4">
                        <div className="flex items-center gap-2">
                            <span 
                                className="text-center text-[138px] font-black leading-none font-roboto -ml-3 -mb-3"
                                style={{
                                    background: 'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                2
                            </span>
                            <h2 
                                className="text-2xl font-bold leading-[30px]"
                                style={{
                                    color: 'var(--neoncarrot-50, #FFFEFD)',
                                    fontFamily: 'var(--body-family, Roboto)'
                                }}
                            >
                                Tri de l'email par catégories
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full sm:w-[280px] md:w-[300px] relative overflow-hidden">
                <img 
                    src="/assets/img/animated-card-bg.png" 
                    alt="Card background"
                    className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-end">
                    <div className="flex items-end gap-2 w-full -mb-5 pr-4">
                        <div className="flex items-center gap-2">
                            <span 
                                className="text-center text-[138px] font-black leading-none font-roboto -ml-3 -mb-3"
                                style={{
                                    background: 'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                3
                            </span>
                            <h2 
                                className="text-2xl font-bold leading-[30px]"
                                style={{
                                    color: 'var(--neoncarrot-50, #FFFEFD)',
                                    fontFamily: 'var(--body-family, Roboto)'
                                }}
                            >
                                Réflexion IA autonome
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full sm:w-[280px] md:w-[300px] relative overflow-hidden">
                <img 
                    src="/assets/img/animated-card-bg.png" 
                    alt="Card background"
                    className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-end">
                    <div className="flex items-end gap-2 w-full -mb-5 pr-4">
                        <div className="flex items-center gap-2">
                            <span 
                                className="text-center text-[138px] font-black leading-none font-roboto -ml-3 -mb-3"
                                style={{
                                    background: 'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                4
                            </span>
                            <h2 
                                className="text-2xl font-bold leading-[30px]"
                                style={{
                                    color: 'var(--neoncarrot-50, #FFFEFD)',
                                    fontFamily: 'var(--body-family, Roboto)'
                                }}
                            >
                                Réponse adaptée générée
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
