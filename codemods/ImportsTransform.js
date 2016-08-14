"use strict";
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = function(file, api, options) {
  const importModules = [];

  let source = file.source.split('\n').map((line, index) => {
    const match = line.match(/^\s*import/gi);
    if(match && match.length > 0) {
      const hasAs = line.indexOf(' as ') > -1;
      const fragments = line.replace(';', '').split(' ');
      // turn dots into paths
      let pathFragment = fragments[1];
      const pathFragments = fragments[1].split('.').filter(fragment => fragment.length > 0);
      const backwardsPathMatch = pathFragment.match(/^\.+/);
      const originalModuleName = pathFragments.join('.');

      // construct module name
      let moduleName = pathFragments.map((fragment, index) => {
        if (index > 0) {
          return capitalizeFirstLetter(fragment);
        }
        return fragment;
      }).join('');

      // construct module path
      if (backwardsPathMatch !== null) {
        const dotLength = backwardsPathMatch[0].length;
        if (dotLength === 1) {
          pathFragments.unshift('.');
        } else if (dotLength > 1) {
          let backwardsCount = dotLength -1;
          while (backwardsCount >= 1) {
            pathFragments.unshift('..');
            backwardsCount--;
          }
        }
      }

      const path = pathFragments.join('/');

      if(hasAs) {
        moduleName = fragments[3];
      } else {
        importModules.push({
          original: originalModuleName,
          replacement: moduleName,
        });
      }

      return `import ${moduleName} from '${path}';`;
    }

    return line;
  }).join('\n');

  importModules.forEach(module => {
    source = source.replace(module.original, module.replacement);
  });

  return source;
};
