import React from 'react'
import { motion } from 'framer-motion'
import Beato8Viewer from '../3d/Beato8Viewer'

type Product = {
  id: string
  name: string
  description: string
  image: string
  model: string
  features: string[]
  price: string
}

export default function ProductCard({ product }: { product: Product }) {
  const { id, image, name, description, model, features, price } = product
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
    >
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        {id === 'beato' && model ? (
          <Beato8Viewer className="h-full w-full" />
        ) : (
          <img src={image} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="mt-2 text-sm text-white/70">{description}</p>
        {features && (
          <ul className="mt-2 text-xs text-white/60 space-y-1">
            {features.slice(0, 2).map((feature, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1 h-1 bg-cyan-400 rounded-full mr-2"></span>
                {feature}
              </li>
            ))}
          </ul>
        )}
        {price && (
          <div className="mt-3 text-lg font-bold text-cyan-400">
            {price}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
    </motion.div>
  )
}


