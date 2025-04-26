'use client'

import Header from "./_components/Header"
import Hero from "./_components/Hero"
import ProjectList from "./_components/ProjectList"
import Footer from "./_components/Footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Hero />
      <ProjectList />
      <Footer />
    </main>
  )
}
