/*
 * mta.js
 * Root namespace module
*/

/*jslint           browser : true,   continue : true,
  devel  : true,    indent : 2,       maxerr  : 50,
  newcap : true,     nomen : true,   plusplus : true,
  regexp : true,    sloppy : true,       vars : false,
  white  : true
*/
/*global $, mta */

var mta = (function () {
  'use strict';
  var initModule = function ( $container ) {
      mta.data.initModule();
      mta.model.initModule();
      mta.shell.initModule( $container );
  };

  return { initModule: initModule };
}());
