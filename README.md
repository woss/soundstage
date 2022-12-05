# Soundstage

Soundstage is an object model for Web Audio processing graphs. It provides an API
for creating, manipulating and observing graphs, a sequencing engine for event
record and playback, and a JSONify-able structure for import and export of
Soundstage projects.

## Developing Soundstage

Clone the Soundstage repo and its dependency repos into one location.

```cli
git clone git@github.com:soundio/soundstage.git
git clone git@github.com:stephband/fn.git
git clone git@github.com:stephband/midi.git
```

That location may now be served. Soundstage can be imported (unbuilt) into an
html document. Import it with DEBUG messages turned on:

```html
<script>
    window.DEBUG = true;
</script>

<script type="module">
    import Soundstage from './soundstage/module.js'
    // Do something with Soundstage ...
</script>
```

### Build Soundstage

Build the Soundstage module to the `build/` directory:

```cli
make modules
```

The built version can be imported into an html document:

```html
<script type="module">
    import Soundstage from './soundstage/build/soundstage.js'
    // Do something with Soundstage ...
</script>
```

The built version does not include any DEBUG messages.

### Build documentation

Build documentation found in code comments to markdown files in `docs/`:

```cli
make docs
```
