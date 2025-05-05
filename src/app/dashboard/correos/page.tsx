"use client"

export default function CorreosPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Módulo de Correos Temporalmente no Disponible
        </h1>
        
        <div className="space-y-4 text-gray-600">
          <p>
            El módulo de correos ha sido temporalmente movido mientras realizamos mejoras en el sistema.
          </p>

          <p>
            Por favor, vuelva a revisar más tarde. Estamos trabajando para brindarle una mejor experiencia.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
            <p className="text-blue-700">
              Si necesita acceder a información urgente relacionada con correos, por favor contactenos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
