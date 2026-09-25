# File Manager plugin

File Manager is optional and backend-neutral. Install it after FrameworkPlugin:

```ts
import { FrameworkPlugin } from '@southneuhof/loom'
import {
  FileManagerPlugin,
  type FileManagerPluginOptions,
} from '@southneuhof/loom/file-manager'

app.use(FrameworkPlugin)
app.use(FileManagerPlugin, fileManagerOptions)
```

App supplies opaque `root`, canonical `ManagedAsset` operations, and value
conversion. This provider owns FileManager product selection. Direct FileInput
uploads and asset previews use the app-scoped `adapters.assets` service
installed through `FrameworkPlugin`; input fields do not carry adapters. The
FileManager adapter may map backend paths to asset IDs, but the framework never
parses IDs or assumes endpoint vocabulary.

The example uses an ID model for the standalone FileManager product. If a
FileManager selection feeds a Loom file or image input, use the canonical
`AssetValue` model and make `toModel` return the complete value accepted by the
app's `AssetAdapter`; an ID alone is not an asset input model.

```ts
const fileManagerOptions: FileManagerPluginOptions<string> = {
  root: 'root-id',
  operations: {
    list: ({ parentId, signal }) => api.assets.list({ parentId, signal }),
    upload: (file, { parentId, signal, onProgress }) =>
      api.assets.upload(file, { parentId, signal, onProgress }),
  },
  values: {
    fromModel: (id) => api.assets.resolve(id),
    toModel: (asset) => asset.id,
  },
}
```

Optional operations control UI capability. Missing upload, create-folder, or
remove operations hide corresponding actions. File and Image inputs show picker
only when plugin exists. Mutations invalidate affected parent list; subtree
removal also evicts known child listings. Plugin adds no route. App may create a
route with lazy import, owns permissions, and installs one provider per app.
