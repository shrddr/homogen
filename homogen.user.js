// ==UserScript==
// @name         homoGen
// @namespace    https://github.com/jonatkins/ingress-intel-total-conversion
// @version      1.001
// @description  find a homogenous field
// @author       You
// @match        https://*.ingress.com/intel*
// @match        http://*.ingress.com/intel*
// @grant        none
// @downloadURL  https://github.com/shrddr/homogen/raw/master/homogen.user.js
// @updateURL    https://github.com/shrddr/homogen/raw/master/homogen.user.js
// @supportURL   https://github.com/shrddr/homogen
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'iitc';
plugin_info.dateTimeVersion = '20181212.1';
plugin_info.pluginId = 'homo-gen';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.homogen = function() {};
window.plugin.homogen.listPortals = [];
window.plugin.homogen.resultsDiv = [];

var setup = function() {
  if(window.useAndroidPanes()) {
    android.addPane("plugin-homogen", "Homo Gen", "ic_action_paste");
    addHook("paneChanged", window.plugin.homogen.onPaneChanged);
  } else {
    $('#toolbox').append('<a onclick="window.plugin.homogen.openPanel()" title="HomoGen control panel [h]" accesskey="h">HomoGen</a>');
  }

  $("<style>")
    .prop("type", "text/css")
    .html("#portalslist.mobile {\n  background: transparent;\n  border: 0 none !important;\n  height: 100% !important;\n  width: 100% !important;\n  left: 0 !important;\n  top: 0 !important;\n  position: absolute;\n  overflow: auto;\n}\n\n#portalslist table {\n  margin-top: 5px;\n  border-collapse: collapse;\n  empty-cells: show;\n  width: 100%;\n  clear: both;\n}\n\n#portalslist table td, #portalslist table th {\n  background-color: #1b415e;\n  border-bottom: 1px solid #0b314e;\n  color: white;\n  padding: 3px;\n}\n\n#portalslist table th {\n  text-align: center;\n}\n\n#portalslist table .alignR {\n  text-align: right;\n}\n\n#portalslist table.portals td {\n  white-space: nowrap;\n}\n\n#portalslist table th.sortable {\n  cursor: pointer;\n}\n\n#portalslist table .portalTitle {\n  min-width: 120px !important;\n  max-width: 240px !important;\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n\n#portalslist .sorted {\n  color: #FFCE00;\n}\n\n#portalslist table.filter {\n  table-layout: fixed;\n  cursor: pointer;\n  border-collapse: separate;\n  border-spacing: 1px;\n}\n\n#portalslist table.filter th {\n  text-align: left;\n  padding-left: 0.3em;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n#portalslist table.filter td {\n  text-align: right;\n  padding-right: 0.3em;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n#portalslist .filterNeu {\n  background-color: #666;\n}\n\n#portalslist table tr.res td, #portalslist .filterRes {\n  background-color: #005684;\n}\n\n#portalslist table tr.enl td, #portalslist .filterEnl {\n  background-color: #017f01;\n}\n\n#portalslist table tr.none td {\n  background-color: #000;\n}\n\n#portalslist .disclaimer {\n  margin-top: 10px;\n  font-size: 10px;\n}\n\n#portalslist.mobile table.filter tr {\n  display: block;\n  text-align: center;\n}\n#portalslist.mobile table.filter th, #portalslist.mobile table.filter td {\n  display: inline-block;\n  width: 22%;\n}\n\n")
    .appendTo("head");

  L.GeometryUtil.bearing = function(latlng1, latlng2) {
    var rad = Math.PI / 180,
        lat1 = latlng1.lat * rad,
        lat2 = latlng2.lat * rad,
        lon1 = latlng1.lng * rad,
        lon2 = latlng2.lng * rad,
        y = Math.sin(lon2 - lon1) * Math.cos(lat2),
        x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    var bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    return bearing >= 180 ? bearing-360 : bearing;
  };

  L.GeometryUtil.destination = function(latlng, heading, distance) {
    heading = (heading + 360) % 360;
    var rad = Math.PI / 180,
        radInv = 180 / Math.PI,
        R = 6378137, // approximation of Earth's radius
        lon1 = latlng.lng * rad,
        lat1 = latlng.lat * rad,
        rheading = heading * rad,
        sinLat1 = Math.sin(lat1),
        cosLat1 = Math.cos(lat1),
        cosDistR = Math.cos(distance / R),
        sinDistR = Math.sin(distance / R),
        lat2 = Math.asin(sinLat1 * cosDistR + cosLat1 *
            sinDistR * Math.cos(rheading)),
        lon2 = lon1 + Math.atan2(Math.sin(rheading) * sinDistR *
            cosLat1, cosDistR - sinLat1 * Math.sin(lat2));
    lon2 = lon2 * radInv;
    lon2 = lon2 > 180 ? lon2 - 360 : lon2 < -180 ? lon2 + 360 : lon2;
    return L.latLng([lat2 * radInv, lon2]);
  };
}


window.plugin.homogen.openPanel = function() {
  var container = $('<div>');
  var controls = $('<div>');
  controls.append('<a onclick="window.plugin.homogen.work()">Start</a>');
  container.append(controls);
  var results = $('<div>');
  container.append(results);
  window.plugin.homogen.resultsDiv = results;

  if(window.useAndroidPanes()) {
    $('<div id="portalslist" class="mobile">').append(container).appendTo(document.body);
  } else {
    dialog({
      html: $('<div id="portalslist">').append(container),
      dialogClass: 'ui-dialog-portalslist',
      title: 'HomoGen',
      id: 'homo-gen'
    });
  }
}


window.plugin.homogen.getPortals = function() {
  var retval = false;
  var displayBounds = map.getBounds();

  window.plugin.homogen.listPortals = [];
  $.each(window.portals, function(i, portal) {
    // eliminate offscreen portals (selected, and in padding)
    if(!displayBounds.contains(portal.getLatLng())) return true;
    retval = true;
    window.plugin.homogen.listPortals.push(portal);
  });

  return retval;
}


window.plugin.homogen.makePortalLink = function(portal) {
  var coord = portal.getLatLng();
  var perma = '/intel?ll=' + coord.lat + ',' + coord.lng + '&z=17&pll=' + coord.lat + ',' + coord.lng;

  // jQuery's event handlers seem to be removed when the nodes are removed from the DOM
  var link = document.createElement("a");
  link.textContent = portal.options.data.title + " (" + portal.options.data.latE6 + " " + portal.options.data.lngE6 + ")";
  link.href = perma;
  link.addEventListener("click", function(ev) {
    renderPortalDetails(portal.options.guid);
    ev.preventDefault();
    return false;
  }, false);
  link.addEventListener("dblclick", function(ev) {
    zoomToAndShowPortal(portal.options.guid, [coord.lat, coord.lng]);
    ev.preventDefault();
    return false;
  });
  return link;
}


window.plugin.homogen.onPaneChanged = function(pane) {
  if(pane == "plugin-portalslist")
    window.plugin.homogen.openPanel();
  else
    $("#portalslist").remove()
};


window.plugin.homogen.work = function() {
  function angle (p1, p2) {
    return 180/Math.PI*Math.atan2(p2.lat-p1.lat, p2.lng-p1.lng)
  };
  function compare_radius(a,b) {
    return (a.r > b.r) ? 1 : ((b.r > a.r) ? -1 : 0);
  }

  window.plugin.homogen.resultsDiv.empty();
  if (!window.plugin.homogen.getPortals()) {
    window.plugin.homogen.resultsDiv.append("<p>no portals to work with!</p>");
    return;
  } 

  var mapCenter = map.getBounds().getCenter();
  var polars = [];
  var latlngs = [];
  var rayA = [];
  var rayB = [];
  var rayC = [];
  window.plugin.homogen.listPortals.forEach(function(portal) {
    var latlng = portal.getLatLng();
    latlngs.push(latlng);
    var r = mapCenter.distanceTo(latlng);
    var t = angle(mapCenter, latlng);
    var data = { latlng: latlng, r: r, t: t };
    polars.push(data);
    // pointy side up
    if (-60 < t && t < 0) rayA.push(data);
    if (-180 < t && t < -120) rayB.push(data);
    if (60 < t && t < 120) rayC.push(data);
    // pointy side down
    /*if (0 < t && t < 60) rayA.push(data);
    if (-120 < t && t < -60) rayB.push(data);
    if (120 < t && t < 180) rayC.push(data);*/
  });
  rayA.sort(compare_radius);
  rayB.sort(compare_radius);
  rayC.sort(compare_radius);
  console.log('rayA:', rayA.length);
  console.log('rayB:', rayB.length);
  console.log('rayC:', rayC.length);

  var posA = 0;
  var posB = 0;
  var posC = 0;
  var haveEdgeCandidates = true;

  var output = {};

  do {
    var A = rayA[posA];
    var B = rayB[posB];
    var C = rayC[posC];
    //console.log('ABC:', A, B, C)
    output.tris = window.plugin.homogen.is_l5(latlngs, A.latlng, B.latlng, C.latlng)
    //console.log('output:', output.tris)
    if (posA < rayA.length-1 && (A.r<=B.r || posB == rayB.length-1) && (A.r<=C.r || posC == rayC.length-1)) posA++
    else if (posB < rayB.length-1 && (B.r<=A.r || posA == rayA.length-1) && (B.r<=C.r || posC == rayC.length-1)) posB++
    else if (posC < rayC.length-1 && (C.r<=A.r || posA == rayA.length-1) && (C.r<=B.r || posB == rayB.length-1)) posC++
    else haveEdgeCandidates = false
    //console.log('continue:', haveEdgeCandidates, !lines)
  }
  while (haveEdgeCandidates && !output.tris);

  console.log('end positions:', posA, posB, posC)

  if (output.tris) {
    var populateLines = function(lines, tri) {
      if (!lines[tri.level]) { lines[tri.level] = []; }
      lines[tri.level] = lines[tri.level].concat([[tri.A, tri.o],[tri.B, tri.o],[tri.C, tri.o]]);
      if (tri.abo && tri.aco && tri.bco) { 
        populateLines(lines, tri.abo);
        populateLines(lines, tri.aco);
        populateLines(lines, tri.bco);
      }
      return lines;
    };

    output.lines = {1: [[output.tris.A, output.tris.B], [output.tris.B, output.tris.C], [output.tris.C, output.tris.A]]};
    populateLines(output.lines, output.tris);
    console.log('lines:', output.lines);

    window.plugin.homogen.drawLines(output);
    //window.plugin.homogen.dumbPath(output);
    window.plugin.homogen.calcPath(output);
  }
  window.plugin.homogen.printResults(output);
}

window.plugin.homogen.drawLines = function(output) {
  window.plugin.drawTools.drawnItems.clearLayers();
  $.each(output.lines, function( level, lines ) {
    var lineOptions = window.plugin.drawTools.lineOptions;
    lineOptions.weight = 2;
    if (level == 1) { lineOptions.color = "#e41a1c"; } // red
    if (level == 2) { lineOptions.color = "#ff7f00"; } // orange
    if (level == 3) { lineOptions.color = "#4daf4a"; } // green
    if (level == 4) { lineOptions.color = "#377eb8"; } // blue
    if (level == 5) { lineOptions.color = "#984ea3"; } // violet
    lines.forEach(function(line, i) {
      var poly = L.geodesicPolyline([line[0], line[1]], lineOptions);
      window.plugin.drawTools.drawnItems.addLayer(poly);
    });
  });
  
  window.plugin.drawTools.save();
}

window.plugin.homogen.printResults = function(output) {
  var results = ""
  if (output.tris) {
    var A = output.tris.A;
    var B = output.tris.B;
    var C = output.tris.C;
    var outerDistance = A.distanceTo(B) + B.distanceTo(C) + C.distanceTo(A);
    outerDistance = L.GeometryUtil.readableDistance(outerDistance, true);

    var totalLinks = 0;
    var totalDistance = 0;
    $.each(output.lines, function( level, lines ) {
      lines.forEach(function (line) {
        totalLinks++;
        totalDistance += line[0].distanceTo(line[1]);
      });
    });
    totalDistance = L.GeometryUtil.readableDistance(totalDistance, true);

    var area = L.GeometryUtil.geodesicArea([A, B, C]);
    area = L.GeometryUtil.readableArea(area, true);

    results = `L${output.tris.level} found.<br/>` + 
      `links: ${totalLinks}<br/>` + 
      `outer distance: ${outerDistance}<br/>` + 
      `area: ${area}`;
  }
  else {
    results = 'homogen not found';
  }
  window.plugin.homogen.resultsDiv.append("<p>"+results+"</p>");
}

window.plugin.homogen.makePath = function(output) {
  if (!output) return;
  var t = output.tris;

  path1 = [];
  //            4   3   2
  path1.push(t.abo.abo.abo.o);
  path1.push(t.abo.abo.o);
  path1.push(t.abo.abo.aco.o);
  path1.push(t.abo.abo.bco.o);
  path1.push(t.abo.o);

  path1.push(t.abo.aco.abo.o);
  path1.push(t.abo.aco.o);
  path1.push(t.abo.aco.aco.o);
  path1.push(t.abo.aco.bco.o);

  path1.push(t.abo.bco.abo.o);
  path1.push(t.abo.bco.o);
  path1.push(t.abo.bco.bco.o);
  path1.push(t.abo.bco.aco.o);

  path1.push(t.o); // bottom L4 complete

  path1.push(t.aco.abo.abo.o);
  path1.push(t.aco.abo.o);
  path1.push(t.aco.abo.aco.o);
  path1.push(t.aco.abo.bco.o);
  path1.push(t.aco.o);

  path1.push(t.aco.aco.abo.o);
  path1.push(t.aco.aco.o);
  path1.push(t.aco.aco.aco.o);
  path1.push(t.aco.aco.bco.o);

  path1.push(t.aco.bco.abo.o);
  path1.push(t.aco.bco.o);
  path1.push(t.aco.bco.aco.o);
  path1.push(t.aco.bco.bco.o); // right L4 almost complete

  path1.push(t.bco.abo.abo.o);
  path1.push(t.bco.abo.o);
  path1.push(t.bco.abo.aco.o);
  path1.push(t.bco.abo.bco.o);
  path1.push(t.bco.o);

  path1.push(t.bco.bco.abo.o);
  path1.push(t.bco.bco.o);
  path1.push(t.bco.bco.bco.o);
  path1.push(t.bco.bco.aco.o); 

  path1.push(t.bco.aco.abo.o);
  path1.push(t.bco.aco.o);
  path1.push(t.bco.aco.bco.o);
  path1.push(t.bco.aco.aco.o); // left L4 almost complete

  path1.push(t.C);
  return path1;
}

window.plugin.homogen.dumbPath = function(output) {
  var results = ""
  var path1 = window.plugin.homogen.makePath(output);
  var distance = 0;
  var lineOptions = window.plugin.drawTools.lineOptions;
  lineOptions.color = "#000000"; // black

  for (var i = 0; i < path1.length-1; i++) {
    var p1 = path1[i];
    var p2 = path1[i+1];
    distance += p1.distanceTo(p2);
    //var poly = L.geodesicPolyline([p1, p2], lineOptions);
    //window.plugin.drawTools.drawnItems.addLayer(poly);
  }
  distance = L.GeometryUtil.readableDistance(distance, true);
  results = `path1 distance: ${distance}<br/>`;
  window.plugin.homogen.resultsDiv.append("<p>"+results+"</p>");
}

window.plugin.homogen.calcPath = function(output) {
  var results = ""
  var path1 = window.plugin.homogen.makePath(output);
  var totalDistance = 0;
  var lineOptions = window.plugin.drawTools.lineOptions;
  lineOptions.color = "#000000"; // black

  var currentPos = path1[0];
  for (var i = 1; i < path1.length; i++) {
    var target = path1[i];
    var dist = currentPos.distanceTo(target);
    if (dist > 39) {
      dist -= 39;
      var bearing = L.GeometryUtil.bearing(currentPos, target);
      target = L.GeometryUtil.destination(currentPos, bearing, dist);
      var poly = L.geodesicPolyline([currentPos, target], lineOptions);
      window.plugin.drawTools.drawnItems.addLayer(poly);
      currentPos = target;
      totalDistance += dist;
    }
  }
  totalDistance = L.GeometryUtil.readableDistance(totalDistance, true);
  results = `path1 lazy distance: ${totalDistance}<br/>`;
  window.plugin.homogen.resultsDiv.append("<p>"+results+"</p>");
  window.plugin.drawTools.save();
}

window.plugin.homogen.point_in_triangle = function(A, B, C, o) {
  var v0x = C.lng-A.lng, v0y = C.lat-A.lat,
      v1x = B.lng-A.lng, v1y = B.lat-A.lat,
      v2x = o.lng-A.lng, v2y = o.lat-A.lat,
      dot00 = v0x*v0x + v0y*v0y,
      dot01 = v0x*v1x + v0y*v1y,
      dot02 = v0x*v2x + v0y*v2y,
      dot11 = v1x*v1x + v1y*v1y,
      dot12 = v1x*v2x + v1y*v2y
  var b = (dot00 * dot11 - dot01 * dot01),
      inv = b === 0 ? 0 : (1 / b),
      u = (dot11*dot02 - dot01*dot12) * inv,
      v = (dot00*dot12 - dot01*dot02) * inv
  return u>=0 && v>=0 && (u+v < 1)
}

window.plugin.homogen.is_l2 = function(latlngs, A, B, C) {
  for (let o of latlngs) {
    if (o != A && o != B && o != C && window.plugin.homogen.point_in_triangle(A,B,C,o)) {
      return { 'A': A, 'B': B, 'C': C, 'o': o, 'level': 2 }
    }
  }
  return false
}

window.plugin.homogen.is_l3 = function(latlngs, A, B, C) {
  var inside = []
  for (let o of latlngs) {
    if (o != A && o != B && o != C && window.plugin.homogen.point_in_triangle(A,B,C,o))
      inside.push(o)
  }
  for (let o of inside) {
    var r1 = window.plugin.homogen.is_l2(inside, A, B, o)
    var r2 = window.plugin.homogen.is_l2(inside, A, o, C)
    var r3 = window.plugin.homogen.is_l2(inside, o, B, C)
    if (r1 && r2 && r3) {
      return { 'A': A, 'B': B, 'C': C, 'o': o, 'abo': r1, 'aco': r2, 'bco': r3, 'level': 3 }
    }
  }
  return false
}

window.plugin.homogen.is_l4 = function(latlngs, A, B, C) {
  var inside = []
  for (let o of latlngs) {
    if (o != A && o != B && o != C && window.plugin.homogen.point_in_triangle(A,B,C,o))
      inside.push(o)
  }
  for (let o of inside) {
    var r1 = window.plugin.homogen.is_l3(inside, A, B, o)
    var r2 = window.plugin.homogen.is_l3(inside, A, o, C)
    var r3 = window.plugin.homogen.is_l3(inside, o, B, C)
    if (r1 && r2 && r3) {
      return { 'A': A, 'B': B, 'C': C, 'o': o, 'abo': r1, 'aco': r2, 'bco': r3, 'level': 4 }
    }
  }
  return false
}

window.plugin.homogen.is_l5 = function(latlngs, A, B, C) {
  var inside = []
  for (let o of latlngs) {
    if (o != A && o != B && o != C && window.plugin.homogen.point_in_triangle(A,B,C,o))
      inside.push(o)
  }
  for (let o of inside) {
    var r1 = window.plugin.homogen.is_l4(inside, A, B, o)
    var r2 = window.plugin.homogen.is_l4(inside, A, o, C)
    var r3 = window.plugin.homogen.is_l4(inside, o, B, C)
    if (r1 && r2 && r3) {
      return { 'A': A, 'B': B, 'C': C, 'o': o, 'abo': r1, 'aco': r2, 'bco': r3, 'level': 5 }
    }
  }
  return false
}


// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end


// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);