//  document.addEventListener('mousedown', function(e) 
//  {
//  	var target = e.target
//    console.log(`mousedown target ${target.tagName}`);
//  
//    if(target && target.tagName)
//  
//  	while (target && target.tagName !== 'A') 
//  	{
//  		target = target.parentNode;
//  		if (!target) { return; }
//  	}
//  	
//  	//if(confirm ('open:'+ target.href) == false)
//  	if(!target.href || target.href.length==0)
//  	{
//  		e.preventDefault();
//  		return false;
//  	}
//  	return;
//  }, false);
//  
//  document.addEventListener("click", (e) => {
//    const target = e.target.closest("a, button, [onclick]");
//    if (!target) return;
//  
//    const isPopup =
//      (target.tagName === "A" && target.target === "_blank") ||
//      (target.onclick && target.onclick.toString().includes("window.open"));
//  
//    if (isPopup) {
//      e.preventDefault();
//      e.stopPropagation();
//      console.log("Blocked popup:", target.href || target.onclick);
//    }
//  }, true);