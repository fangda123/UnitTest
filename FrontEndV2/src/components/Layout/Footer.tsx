/**
 * Footer Component
 * แสดง credit "portfolio.iotstart.me" ในทุกหน้า
 */

function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-dark-700 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Powered by{' '}
            <a
              href="https://portfolio.iotstart.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 transition-colors font-semibold"
            >
              portfolio.iotstart.me
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;


