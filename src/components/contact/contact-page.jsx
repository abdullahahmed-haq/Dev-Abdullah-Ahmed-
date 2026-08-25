import './contact-page.css'

export default function ContactPage({ language }) {
  return (
    <main className="contact-page">
      <h1>{language === 'ar' ? 'قريبًا' : 'Coming soon'}</h1>
    </main>
  )
}
