https://astexplorer.net
https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-paths
https://babeljs.io/docs/core-packages/babel-types/

Goals:

* pass imported DSs
* allow some imports to be actually imported (using test runner)
* export any top scope ID in a wrapper
* allow module IDs refer to original versions of other module IDs

Requirements

Ignored imports are pure. This is an example of an impure import:

    import map from 'lodash'
    // map just maps here
    import 'magic-hack'
    // map launches missles here

In this case both imports should be ignored as `lodash` and `magic-hack` are dependent modules and form a unit together.

In case only some of the imported values has to be ignored ignore them like this:

    // @introscope ignore: ['loadItems']
    import { loadItems, saveItems } from 'api'
    // here `loadItems` comes from 'api' module
    // and `saveItems` comes from a test
