import React from 'react'
import ProductCard from '../components/ui/ProductCard'
import ProductRail from '../components/showroom/ProductRail'

const BASE = import.meta.env.BASE_URL
const products = [
  {
    image: `${BASE}images/products/KNOBO.png`,
    title: 'Knobo',
    description: '$130 — 8 perillas asignables para un control preciso y creativo.',
  },
  {
    image: `${BASE}images/products/LOOPO.png`,
    title: 'LOOPO',
    description: '£130 — Compacto, dinámico y listo para la acción.',
  },
  {
    image: `${BASE}images/products/FADO.png`,
    title: 'FADO',
    description: '$150 — Movimiento fluido y expresivo.',
  },
  {
    image: `${BASE}images/products/BEATO.png`,
    title: 'Beato 8',
    description: '$185 — Compacto y potente.',
  },
  {
    image: `${BASE}images/products/MIXO.png`,
    title: 'Mixo',
    description: '$200 — Flujo total, mezcla a tu manera.',
  },
  {
    image: `${BASE}images/products/BEATO16.png`,
    title: 'Beato 16 (Nuevo)',
    description: '$250 — Más control que nunca.',
  },
]

export default function ProductsSection() {
  return (
    <section id="productos" className="relative py-20">
      {/* Background - imagen de fondo */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url('${BASE}images/fondonuestrosproductos.png')`,
          zIndex: 1000000
        }}
      />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" style={{ zIndex: 1000001 }}>
        {/* Debug: Verificar si la imagen se carga */}
        <div className="absolute top-4 left-4 text-white text-xs bg-red-500 p-2 rounded z-10">
          Debug: Verificando imagen de fondo
        </div>
        
        {/* Debug: Imagen de prueba */}
        <div className="absolute top-16 left-4 w-32 h-20 border-2 border-white z-10">
          <img 
            src={`${BASE}images/fondonuestrosproductos.png`}
            alt="Debug background" 
            className="w-full h-full object-cover"
            onLoad={() => console.log('Imagen cargada correctamente')}
            onError={() => console.log('Error al cargar la imagen')}
          />
        </div>
        
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Nuestros Productos</h2>
          <p className="mt-3 text-white/70">Controladores MIDI hechos a medida para tu flujo creativo.</p>
        </div>

        {/* (Se movió la vista 3D al héroe) */}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.title} image={p.image} title={p.title} description={p.description} />
          ))}
        </div>
      </div>

      {/* Rail pinned horizontal (showroom) */}
      <div style={{ zIndex: 1000002 }}>
        <ProductRail />
      </div>
    </section>
  )
}


