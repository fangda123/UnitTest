/**
 * Footer Component
 * แสดง credit "portfolio.iotstart.me" ในทุกหน้า
 */

function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-dark-700 py-3 sm:py-4 mt-auto">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-center">
          <p className="text-gray-400 text-xs sm:text-sm text-center">
            © {new Date().getFullYear()} Powered by{' '}
            <a
              href="https://portfolio.iotstart.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 transition-colors font-semibold break-all sm:break-normal"
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


