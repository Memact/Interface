import Search from './pages/Search'
import { useExtension } from './hooks/useExtension'

export default function App() {
  const extension = useExtension()
  return <Search extension={extension} />
}
