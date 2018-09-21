/* --------------------------------------------
  Ansley Lam
18/09/2018
--------------------------------------------- */
/*
function Yesfilter(){

document.getElementById("filterYes");
document.getElementById('genderMale').disabled=false;
document.getElementById('genderFemale').disabled=false;
document.getElementById('age').disabled=false;
document.getElementById('opage').disabled=false;
document.getElementById('income').disabled=false;
document.getElementById('maritalstatus').disabled=false;
document.getElementById('mortgageamount').disabled=false;
document.getElementById('rentamount').disabled=false;
document.getElementById('mdistno').disabled=false;
document.getElementById('mdistyes').disabled=false;
document.getElementById('mdistdeclined').disabled=false;
document.getElementById('rdistno').disabled=false;
document.getElementById('rdistyes').disabled=false;
document.getElementById('rdistdeclined').disabled=false;
document.getElementById('workstatus').disabled=false;
document.getElementById('livingarrangement').disabled=false;
document.getElementById('household').disabled=false;
document.getElementById('oppsr').disabled=false;
document.getElementById('personalsafetyrating').disabled=false;
document.getElementById('opcr').disabled=false;
document.getElementById('communityrating').disabled=false;
document.getElementById('opfsr').disabled=false;
document.getElementById('futuresecurityrating').disabled=false;
document.getElementById('postcode').disabled=false;
}
*/
/*
function Nofilter(){

document.getElementById("filterNo");
document.getElementById('genderMale').disabled=true;
document.getElementById('genderFemale').disabled=true;
document.getElementById('age').disabled=true;
document.getElementById('opage').disabled=true;
document.getElementById('income').disabled=true;
document.getElementById('maritalstatus').disabled=true;
document.getElementById('mortgageamount').disabled=true;
document.getElementById('rentamount').disabled=true;
document.getElementById('mdistno').disabled=true;
document.getElementById('mdistyes').disabled=true;
document.getElementById('mdistdeclined').disabled=true;
document.getElementById('rdistno').disabled=true;
document.getElementById('rdistyes').disabled=true;
document.getElementById('rdistdeclined').disabled=true;
document.getElementById('workstatus').disabled=true;
document.getElementById('livingarrangement').disabled=true;
document.getElementById('household').disabled=true;
document.getElementById('oppsr').disabled=true;
document.getElementById('personalsafetyrating').disabled=true;
document.getElementById('opcr').disabled=true;
document.getElementById('communityrating').disabled=true;
document.getElementById('opfsr').disabled=true;
document.getElementById('futuresecurityrating').disabled=true;
document.getElementById('postcode').disabled=true;
}
*/


function ToggleOnOff(){
  if ($("#opage").val() == ''){
    document.getElementById('age').disabled=true;
  }
  else if ($("#opage").val() != ''){
    document.getElementById('age').disabled=false;
  }
  if ($("#oppsr").val() == ''){
    document.getElementById('personalsafetyrating').disabled=true;
  }
  else if ($("#oppsr").val() != ''){
    document.getElementById('personalsafetyrating').disabled=false;
  }
  if ($("#opfsr").val() == ''){
    document.getElementById('futuresecurityrating').disabled=true;
  }
  else if ($("#opfsr").val() != ''){
    document.getElementById('futuresecurityrating').disabled=false;
  }
  if ($("#opcr").val() == ''){
    document.getElementById('communityrating').disabled=true;
  }
  else if ($("#opcr").val() != ''){
    document.getElementById('communityrating').disabled=false;
  }
  if ($("#postcodeRequired").val() == ''){
    document.getElementById('postcode').disabled=true;
  }
  else if ($("#postcodeRequired").val() != ''){
    document.getElementById('postcode').disabled=false;
  }
}


    