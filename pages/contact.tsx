export default function Contact() {
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
      <p className="mb-4">
        Book your free consultation or reach us at{' '}
        <a href="mailto:info@admitsonly.com" className="text-accent">
          info@admitsonly.com
        </a>.
      </p>
      <form className="space-y-4 max-w-md">
        <div>
          <label className="block mb-1">Name</label>
          <input
            type="text"
            name="name"
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            name="email"
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block mb-1">Message</label>
          <textarea
            name="message"
            rows={4}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="How can we help?"
          />
        </div>
        <button
          type="submit"
