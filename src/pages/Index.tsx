import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Добро пожаловать!</h1>
        <p className="text-xl text-gray-700 mb-6">
          Начните свой выгодный обмен USDT на VND прямо сейчас!
        </p>
        <Link to="/exchange">
          <Button className="w-full py-3 text-lg bg-blue-600 hover:bg-blue-700 transition-colors duration-300">
            Перейти к обмену USDT/VND
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;