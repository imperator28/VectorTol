import { StackGrid } from './components/grid/StackGrid';
import { TargetPanel } from './components/targets/TargetPanel';
import { ResultsFooter } from './components/summary/ResultsFooter';
import { Toolbar } from './components/toolbar/Toolbar';
import './App.css';

export function App() {
  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">
        <div className="sidebar">
          <TargetPanel />
        </div>
        <div className="grid-container">
          <StackGrid />
        </div>
      </div>
      <ResultsFooter />
    </div>
  );
}
