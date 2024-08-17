import { createGlobalStyle } from 'styled-components';
import Home from './components/Home';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    background-color: #f1f1f1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: rgb(19, 20, 27);
  }
`;

const App: React.FC = () => {
  return (
    <>
      <GlobalStyle />
      <Home/>
    </>
  );
};

export default App;