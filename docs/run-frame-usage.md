# RunFrame Usage

RunFrame provides a standalone JS file that automatically loads a runframe into an element with the id "root"

This is essentially the code that the "standalone.js" file contains (prior to compilation):

```tsx
import { createRoot } from "react-dom/client"
import { RunFrameWithApi } from "./index"

const root = createRoot(document.getElementById("root")!)

root.render(<RunFrameWithApi />)
```


