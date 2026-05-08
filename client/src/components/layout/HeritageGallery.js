import React, { useState, useEffect, useCallback } from 'react';

// Heritage images with their metadata
const HERITAGE_IMAGES = [
  {
    id: 1,
    src: '/images/gallery/president-tshisekedi-rdc-fr.jpg',
    alt: 'Président Félix Tshisekedi',
    title: 'Leadership National',
    description: 'Son Excellence Félix Tshisekedi, Président de la République',
    shape: 'portrait', // tall image
    priority: true
  },
  {
    id: 2,
    src: '/images/gallery/forest-bassin-congo-fr.jpg',
    alt: 'Bassin du Congo',
    title: 'Bassin du Congo',
    description: 'Deuxième poumon vert de la planète, patrimoine mondial',
    shape: 'landscape'
  },
  {
    id: 3,
    src: '/images/gallery/okapi-espece-protegee-fr.jpg',
    alt: 'Okapi - Espèce protégée',
    title: 'Okapi',
    description: 'Espèce endémique protégée, fierté nationale',
    shape: 'square'
  },
  {
    id: 4,
    src: '/images/gallery/gorille-montagne-virunga-fr.jpg',
    alt: 'Gorille des montagnes - Virunga',
    title: 'Gorille des Montagnes',
    description: 'Parc National des Virunga, site UNESCO',
    shape: 'square'
  },
  {
    id: 5,
    src: '/images/gallery/volcan-nyiragongo-goma-fr.jpg',
    alt: 'Volcan Nyiragongo - Goma',
    title: 'Volcan Nyiragongo',
    description: 'Merveille naturelle de Goma, Nord-Kivu',
    shape: 'square'
  },
  {
    id: 6,
    src: '/images/gallery/fleuve-congo-kinshasa-fr.jpg',
    alt: 'Fleuve Congo - Kinshasa',
    title: 'Fleuve Congo',
    description: 'Artère vitale de la RDC, le plus profond du monde',
    shape: 'landscape'
  }
];

const HeritageGallery = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-advance every 5 seconds
  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % HERITAGE_IMAGES.length);
      setIsTransitioning(false);
    }, 500);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const goToSlide = (index) => {
    if (index === currentIndex) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 500);
  };

  const currentImage = HERITAGE_IMAGES[currentIndex];

  return (
    <div className="heritage-gallery">
      <div className="heritage-gallery-inner">
        {/* Map through all images, only show active one */}
        {HERITAGE_IMAGES.map((image, index) => (
          <div
            key={image.id}
            className={`heritage-slide ${index === currentIndex ? 'active' : ''}`}
            style={{
              opacity: index === currentIndex ? 1 : 0,
              zIndex: index === currentIndex ? 1 : 0
            }}
          >
            <div className="heritage-image-wrapper">
              <img
                src={image.src}
                alt={image.alt}
                className={`heritage-image ${image.shape}`}
                loading={image.priority ? 'eager' : 'lazy'}
              />
              
              {/* Caption Overlay */}
              <div className="heritage-caption">
                <h3>{image.title}</h3>
                <p>{image.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="heritage-dots">
        {HERITAGE_IMAGES.map((image, index) => (
          <button
            key={image.id}
            className={`heritage-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Aller à ${image.title}`}
            title={image.title}
          />
        ))}
      </div>
    </div>
  );
};

export default HeritageGallery;