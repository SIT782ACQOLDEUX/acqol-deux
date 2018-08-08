//var addNumbersLocal=function(){
   // var firstNumber=$('#firstNumber').val();
  //  var secondNumber=$('#secondNumber').val();
   // var sum=firstNumber+secondNumber;
  //  $( "#result" ).html(sum);
//}

// this function waits for the page to be loaded, this is because if we need
// to bind elements, they need to exist first.
//$(document).ready(function(){
 //   console.log('The paga has now loaded')
  //  $('#adderButton').bind('click',addNumbersLocal)
//});



$(document).ready(function(e){

  $("#uploadcsv").on('submit',(function(e) {
    $("#result").html('Loading - Please Wait');
    $("body").css("cursor", "progress");
    document.getElementById("submitButton").disabled = true; //disable submit button 
		e.preventDefault();
		$.ajax({
        	url: "/upload",
			type: "POST",
			data:  new FormData(this),
			beforeSend: function(){$("#body-overlay").show();},
			contentType: false,
    	    processData:false,
			success: function(data)
		    {
			$("#result").html(data);
      $("#result").css('opacity','1');
      $("body").css("cursor", "default");
      document.getElementById("submitButton").disabled = false; //reenable submit button 
			},
		  	error: function() 
	    	{
	    	} 	        
	   });
	}));

});

