I did not find a nice way to reload a userscript into Chrome for easy development. Current workaround:

1. Split the file into "loader" and "worker" at line 14.

2. Add this line to "loader":

   ```
   // @require      file:///path/to/worker.js
   ```

3. Give tampermonkey access to filesystem in browser extension settings.

4. Only put the loader into tampermonkey, it will fetch fresh worker on every page reload.

5. Stitch the loader and worker together and throw away the extra line when finished.