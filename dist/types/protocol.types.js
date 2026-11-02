                                                                   

                           
             
               
               
                       
 

                             
                
                
 

                                          
               
                          
                       
                        
                   
                     
                       
                    
 

                               
                 
                
               
                                         
 

                               
                     
                
                      
                     
                       
                   
                       
                         
                          
 

                                  
                
                      
                       
                   
                       
                         
 

                               
                
                      
                      
 

/**
 * [SSOT: Single Source of Truth]
 * 생존 교범 5대 핵심 생존 공학 카테고리 정의
 * - FOOD: [물·식량·보존] (수분 확보 및 정수, 식량 수렵·채집, 보존식)
 * - SHELTER: [불·거처·보온] (발화 공학, 은신처/대피소 구축, 축열 화덕)
 * - TOOLS: [도구·의복·공작] (도끼·칼, 끈·로프, 봉제·의복, 뼈·석기)
 * - MATERIALS: [소재·천연화학] (숯 가마, 송진 접착제, 탄닌 가죽)
 * - MEDICINE: [의약·위생·방호] (잿물 비누, 방독 마스크, 야전 부목)
 */
export const PROTOCOL_CATEGORIES = [
  'FOOD',
  'SHELTER',
  'TOOLS',
  'MATERIALS',
  'MEDICINE',
]         ;

                                                                    

export const FEED_CATEGORY_KEYS = ['ALL', ...PROTOCOL_CATEGORIES]         ;
                                                                  

export function isProtocolCategory(value         )                            {
  return typeof value === 'string' && (PROTOCOL_CATEGORIES                     ).includes(value);
}

                                  
                   
                          
                     
 

                           
                     
                             
                
                   

                           
                          
                  
                       
                      
                     
                         
                            
                        
                        
                             
                           
                             
                     
                     
                       
                                                                
 
