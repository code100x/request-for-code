// eslint-disable-next-line react/prop-types
const StatCard = ({ title, value }) => (
  <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-lg shadow-lg text-white transform hover:scale-105 transition-transform duration-200">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

export default StatCard;
