var app = angular.module('meetingsApp',['angular.filter']);
app.controller('meetingsCtrl', function($scope, $http, $location, $anchorScroll) {
var l = 0;
dayArr = ["Sunday", "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
$scope.dayArrNamed = [{name:"Sunday"}, {name:"Monday"}, {name:"Tuesday"}, {name:"Wednesday"}, {name:"Thursday"}, {name:"Friday"}, {name:"Saturday"}];
$scope.regionArrNamed = [{name:'ANAHEIM'},{name:'ARTESIA'},{name:'BELLFLOWER'},{name:'BUENA PARK'},{name:'CARSON'},{name:'CATALINA ISLAND'},{name:'COMPTON'},{name:'CYPRESS'},{name:'DOWNEY'},{name:'HAWAIIAN GARDENS'},{name:'HUNTINGTON BEACH'},{name:'HUNTINGTON PARK'},{name:'LAKEWOOD'},{name:'LONG BEACH'},{name:'LOS ALAMITOS'},{name:'MAYWOOD'},{name:'NORWALK'},{name:'PARAMOUNT'},{name:'REDONDO BEACH'},{name:'SAN PEDRO'},{name:'SEAL BEACH'},{name:'SIGNAL HILL'},{name:'SOUTH GATE'},{name:'SUNSET BEACH'},{name:'TORRANCE'},{name:'WHITTIER'},{name:'WILMINGTON'}];
$scope.selectedDay=$scope.dayArrNamed[0];
$scope.selectedRegion=$scope.regionArrNamed[0];
$scope.scrollTo = function(id) {
    var old = $location.hash();
    $location.hash(id);
    $anchorScroll();
    //reset to old to keep any additional routing logic from kicking in
    $location.hash(old);
};
$scope.selectedDayHandler = function(){
    dayArrNum = ["Sunday", "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    $scope.indicated = [{day:"0"}];
    if(true){
        window.location.hash=$scope.selectedDay; //+$scope.selectedRegion;
    }
}
$scope.selectedRegionHandler = function(){
    $scope.indicated = [{region:"0"}];
    if(true){
        window.location.hash=$scope.selectedDay+$scope.selectedRegion; //+$scope.selectedRegion;
    }
}
var source = ["https://hacoaa.org/wp-admin/admin-ajax.php?action=meetings"];
  $http.get(source[0]).then(function (response) {
    $scope.eventData = response.data;
  });
  $scope.addClss = function(idx,dayVar){
       for (var m=0; m<7; m++){
        if (idx==l){
          if (dayVar==m){ angular.element(document.querySelector("."+dayArr[m])).addClass("nohide"); l++; }
        } else {
          if (dayVar==m){ angular.element(document.querySelector("."+dayArr[m])).addClass("hidd"); }
        }
      }
  }
 }
);
app.filter('weekdayFilter', function(){
  return function dayOfWeekAsString(dayIndex) {
    return dayArr[dayIndex];
  }
});
app.filter('mapsEncoding', function(){
  return function dayOfWeekAsString(loc) {
    return "https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(loc);
  }
});
app.filter('vmFilter', function(){
  return function vmString(vmIndex) {
    var parts = vmIndex.split("/");
    var vm
    if (parts[2] == "zoom.us" || parts[2] == "www.zoom.us" || parts[2] == "us04web.zoom.us" || parts[2] == "us06web.zoom.us" || parts[2] == "us02web.zoom.us"){
            if(parts[4]){
                if(parts[4].includes("pwd")){
                    vm = parts[4].split("?");
                    return vm[0];
                } else {
                    return parts[4];
                }
            }
    } 
    else if ( parts[2] == "google.com" || parts[2] == "www.google.com" || parts[2] == "meet.google.com"){
            return parts[3];
    } else
        return vmIndex;
    }
  }
);
app.filter('notesFilter', function(){
  return function notesString(notesIndex) {
    if ( typeof notesIndex !== "undefined"){
        const noteVar = notesIndex.substring(18, 255);
        const noteVarAr = noteVar.split(" ");
        return noteVarAr[0];
    }
  }
});
app.filter('tel', function () {
    return function (tel) {
        if (!tel) { return ''; }

        var value = tel.toString().trim().replace(/^\+/, '');

        if (value.match(/[^0-9]/)) {
            return tel;
        }

        var country, city, number;

        switch (value.length) {
            case 10: // +1PPP####### -> C (PPP) ###-####
                country = 1;
                city = value.slice(0, 3);
                number = value.slice(3);
                break;

            case 11: // +CPPP####### -> CCC (PP) ###-####
                country = value[0];
                city = value.slice(1, 4);
                number = value.slice(4);
                break;

            case 12: // +CCCPP####### -> CCC (PP) ###-####
                country = value.slice(0, 3);
                city = value.slice(3, 5);
                number = value.slice(5);
                break;

            default:
                return tel;
        }

        if (country == 1) {
            country = "";
        }

        number = number.slice(0, 3) + '-' + number.slice(3);

        return (country + " (" + city + ") " + number).trim();
    };
});
