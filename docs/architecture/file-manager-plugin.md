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

App supplies opaque `root`, `ManagedAsset` operations, and value conversion.
The provider owns File Manager selection. A listing entry can be a file or a
folder. The provider value adapter accepts and returns canonical `AssetValue`
values for FileManagerInput, FileInput, and ImageInput. It maps those values to
and from managed listing entries. A folder cannot become a persisted asset.

The standalone `AssetPicker` emits a `ManagedAsset`. The standalone FileManager
footer slot exposes its selected `ManagedAsset`. These surfaces do not call the
provider value adapter. Direct FileInput uploads and asset previews use the
app-scoped `adapters.assets` service installed through `FrameworkPlugin`; input
fields do not carry adapters. The app owns backend path and URL mapping.

```ts
import type { AssetValue } from '@southneuhof/loom/assets'
import type { FileManagerPluginOptions, ManagedAsset } from '@southneuhof/loom/file-manager'

const fileManagerOptions: FileManagerPluginOptions = {
  root: 'root-id',
  operations: {
    list: ({ parentId, signal }) => api.assets.list({ parentId, signal }),
    upload: (file, { parentId, signal, onProgress }) =>
      api.assets.upload(file, { parentId, signal, onProgress }),
  },
  values: {
    fromModel: (value: AssetValue) => api.assets.resolve(value.id),
    toModel: (asset: ManagedAsset): AssetValue => {
      if (asset.kind !== 'file') throw new Error('Folders cannot be persisted as input assets.')
      const url = asset.previewUrl
      if (!url) throw new Error('A file URL is required for an input asset.')
      return {
        kind: 'file',
        id: asset.id,
        url,
        name: asset.name,
        ...(asset.mimeType === undefined ? {} : { mimeType: asset.mimeType }),
        ...(asset.size === undefined ? {} : { size: asset.size }),
        ...(asset.updatedAt === undefined ? {} : { updatedAt: asset.updatedAt }),
        ...(asset.metadata === undefined ? {} : { metadata: asset.metadata }),
      }
    },
  },
}
```

Import `AssetValue` from `@southneuhof/loom/assets` and `ManagedAsset` from
`@southneuhof/loom/file-manager`. This example uses `previewUrl` as the
canonical asset URL. An app that stores a different URL must map its stored
asset value explicitly. The Loom types define this boundary; the app still
validates backend values with its schema and validates untyped input with
`AssetAdapter.read`.

Optional operations control UI capability. Missing upload, create-folder, or
remove operations hide corresponding actions. File and Image inputs show picker
only when plugin exists. Mutations invalidate affected parent list; subtree
removal also evicts known child listings. Plugin adds no route. App may create a
route with lazy import, owns permissions, and installs one provider per app.
