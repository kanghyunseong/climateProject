// 경기기후플랫폼 레이어 목록
export interface LayerInfo {
  category: string;
  subcategory: string;
  name: string;
  wmsName: string;
  wfsName: string;
  type: 'vector' | 'raster'; // 벡터는 WFS+WMS, 래스터는 WMS만 지원
  description?: string;
}

export const ALL_LAYERS: LayerInfo[] = [
  // ===== 그린인프라 =====
  // 도시 공원 평가
  { category: '그린인프라', subcategory: '도시 공원 평가', name: '공원 서비스 종합평가 (시군)', wmsName: 'spggcee:sigun_park_scr', wfsName: 'spggcee:sigun_park_scr', type: 'vector' },
  { category: '그린인프라', subcategory: '도시 공원 평가', name: '공원 서비스 종합평가 (읍면동)', wmsName: 'spggcee:emd_park_scr', wfsName: 'spggcee:emd_park_scr', type: 'vector' },

  // 생태계 서비스 평가 > 공급서비스
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 공급서비스', name: '수량 공급', wmsName: 'spggcee:rst_sson_rn', wfsName: '', type: 'raster' },

  // 생태계 서비스 평가 > 문화서비스
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 문화서비스', name: '경관 가치', wmsName: 'spggcee:rst_scvl', wfsName: '', type: 'raster' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 문화서비스', name: '생태 관광', wmsName: 'spggcee:rst_ecotrm', wfsName: '', type: 'raster' },

  // 생태계 서비스 평가 > 종합 결과
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 종합 결과', name: '생태계서비스 스코어 (시군)', wmsName: 'spggcee:sigun_ecosys_srvc', wfsName: 'spggcee:sigun_ecosys_srvc', type: 'vector' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 종합 결과', name: '생태계서비스 스코어 (읍면동)', wmsName: 'spggcee:emd_ecosys_srvc', wfsName: 'spggcee:emd_ecosys_srvc', type: 'vector' },

  // 생태계 서비스 평가 > 조절서비스
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 조절서비스', name: '대기조절', wmsName: 'spggcee:rst_air_ajst', wfsName: '', type: 'raster' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 조절서비스', name: '도시 열섬 조절', wmsName: 'spggcee:rst_uhtln', wfsName: '', type: 'raster' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 조절서비스', name: '수질 조절(인)', wmsName: 'spggcee:rst_wtr_purn_p', wfsName: '', type: 'raster' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 조절서비스', name: '수질 조절(질소)', wmsName: 'spggcee:rst_wtr_purn_n', wfsName: '', type: 'raster' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 조절서비스', name: '탄소 저장', wmsName: 'spggcee:rst_cbn_strgat', wfsName: '', type: 'raster' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 조절서비스', name: '탄소 흡수', wmsName: 'spggcee:rst_cbn_abpvl', wfsName: '', type: 'raster' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 조절서비스', name: '토양 침식 조절', wmsName: 'spggcee:rst_soil_ersn', wfsName: '', type: 'raster' },

  // 생태계 서비스 평가 > 지지서비스
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 지지서비스', name: '서식처 질', wmsName: 'spggcee:rst_habtt', wfsName: '', type: 'raster' },
  { category: '그린인프라', subcategory: '생태계 서비스 평가 > 지지서비스', name: '조류종 다양성', wmsName: 'spggcee:rst_bird_dvsty', wfsName: '', type: 'raster' },

  // ===== 기후위기 =====
  // 극한호우
  { category: '기후위기', subcategory: '극한호우 > 취약시설', name: '극한호우 취약시설', wmsName: 'spggcee:flod_weak_fclt', wfsName: 'spggcee:flod_weak_fclt', type: 'vector' },
  { category: '기후위기', subcategory: '극한호우 > 취약시설', name: '이재민 임시거주시설', wmsName: 'spggcee:dsvctm_tmpr_hab_fclt', wfsName: 'spggcee:dsvctm_tmpr_hab_fclt', type: 'vector' },
  { category: '기후위기', subcategory: '극한호우 > 홍수위험도', name: '극한호우 위험도 순위', wmsName: 'spggcee:tm_sigun_flod_dngr_evl_rnk', wfsName: 'spggcee:tm_sigun_flod_dngr_evl_rnk', type: 'vector' },
  { category: '기후위기', subcategory: '극한호우 > 침수흔적', name: '침수흔적지도', wmsName: 'spggcee:tm_fldn_trce', wfsName: 'spggcee:tm_fldn_trce', type: 'vector' },
  { category: '기후위기', subcategory: '극한호우 > 하천', name: '소하천', wmsName: 'spggcee:lsmd_cont_uj301_41', wfsName: 'spggcee:lsmd_cont_uj301_41', type: 'vector' },

  // 산사태
  { category: '기후위기', subcategory: '산사태', name: '경기도 산사태 위험등급', wmsName: 'spggcee:rst_ldsld_dngr_grd', wfsName: '', type: 'raster' },
  { category: '기후위기', subcategory: '산사태', name: '산사태 발생이력', wmsName: 'spggcee:ldsld_ocrn_prst', wfsName: 'spggcee:ldsld_ocrn_prst', type: 'vector' },
  { category: '기후위기', subcategory: '산사태', name: '사방댐', wmsName: 'spggcee:debarr', wfsName: 'spggcee:debarr', type: 'vector' },

  // 폭염
  { category: '기후위기', subcategory: '폭염 > 열쾌적성', name: '폭염 등급 평가', wmsName: 'spggcee:rst_thrcf_evl_41', wfsName: '', type: 'raster' },
  { category: '기후위기', subcategory: '폭염 > 대응시설', name: '무더위쉼터', wmsName: 'spggcee:swtr_rstar', wfsName: 'spggcee:swtr_rstar', type: 'vector' },
  { category: '기후위기', subcategory: '폭염 > 대응시설', name: '응급시설', wmsName: 'spggcee:emcy_mdlcr_inst_cntr', wfsName: 'spggcee:emcy_mdlcr_inst_cntr', type: 'vector' },
  { category: '기후위기', subcategory: '폭염 > 대응시설', name: '의료시설', wmsName: 'spggcee:mdlcr_corp_prst', wfsName: 'spggcee:mdlcr_corp_prst', type: 'vector' },
  { category: '기후위기', subcategory: '폭염 > 대응시설', name: '이동노동자쉼터', wmsName: 'spggcee:tm_mblwkr_rstar', wfsName: 'spggcee:tm_mblwkr_rstar', type: 'vector' },
  { category: '기후위기', subcategory: '폭염 > 온도현황', name: '열환경지도', wmsName: 'spggcee:rst_ctyart_41110', wfsName: '', type: 'raster' },
  { category: '기후위기', subcategory: '폭염 > 온도현황', name: '폭염발생시 체감온도', wmsName: 'spggcee:rst_ctyart_41', wfsName: '', type: 'raster' },

  // ===== 도시생태현황지도 =====
  // 비오톱
  { category: '도시생태현황지도', subcategory: '비오톱 유형도', name: '비오톱 유형도 대분류', wmsName: 'spggcee:biotop_lclsf', wfsName: 'spggcee:biotop_lclsf', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '비오톱 유형도', name: '비오톱 유형도 소분류', wmsName: 'spggcee:biotop_sclsf', wfsName: 'spggcee:biotop_sclsf', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '비오톱 유형도', name: '비오톱 유형도 중분류', wmsName: 'spggcee:biotop_mclsf', wfsName: 'spggcee:biotop_mclsf', type: 'vector' },

  // 토지피복
  { category: '도시생태현황지도', subcategory: '토지피복지도', name: '토지피복 대분류', wmsName: 'spggcee:biotop_lndcvg_lcldf', wfsName: 'spggcee:biotop_lndcvg_lcldf', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '토지피복지도', name: '토지피복 소분류', wmsName: 'spggcee:biotop_lndcvg_sclsf', wfsName: 'spggcee:biotop_lndcvg_sclsf', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '토지피복지도', name: '토지피복 중분류', wmsName: 'spggcee:biotop_lndcvg_mclsf', wfsName: 'spggcee:biotop_lndcvg_mclsf', type: 'vector' },

  // 투수/불투수
  { category: '도시생태현황지도', subcategory: '투수지도', name: '투수/불투수 유형지도', wmsName: 'spggcee:impvs', wfsName: 'spggcee:impvs', type: 'vector' },

  // 현존식생
  { category: '도시생태현황지도', subcategory: '현존식생', name: '현존식생지도', wmsName: 'spggcee:vgmap', wfsName: 'spggcee:vgmap', type: 'vector' },

  // 그린인프라 현황
  { category: '도시생태현황지도', subcategory: '그린인프라', name: '공원 녹지 바이오매스', wmsName: 'spggcee:park_grbt_bioms', wfsName: 'spggcee:park_grbt_bioms', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '그린인프라', name: '공원 현황도', wmsName: 'spggcee:park', wfsName: 'spggcee:park', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '그린인프라', name: '녹지 현황도', wmsName: 'spggcee:grbt', wfsName: 'spggcee:grbt', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '그린인프라', name: '하천 현황도', wmsName: 'spggcee:river', wfsName: 'spggcee:river', type: 'vector' },

  // 습지
  { category: '도시생태현황지도', subcategory: '습지', name: '둠벙', wmsName: 'spggcee:pud', wfsName: 'spggcee:pud', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '습지', name: '묵논 습지', wmsName: 'spggcee:ricefld_wetln', wfsName: 'spggcee:ricefld_wetln', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '습지', name: '염 습지', wmsName: 'spggcee:salt_marsh', wfsName: 'spggcee:salt_marsh', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '습지', name: '하천 습지', wmsName: 'spggcee:rivr_wetln', wfsName: 'spggcee:rivr_wetln', type: 'vector' },

  // 생태축
  { category: '도시생태현황지도', subcategory: '광역 생태축', name: '광역 복원 기회', wmsName: 'spggcee:rst_wdar_rstrt_tppty_anls', wfsName: '', type: 'raster' },
  { category: '도시생태현황지도', subcategory: '광역 생태축', name: '광역 생태축', wmsName: 'spggcee:rst_wdar_min_cst_pass', wfsName: '', type: 'raster' },
  { category: '도시생태현황지도', subcategory: '광역 생태축', name: '광역 최소 비용 경로', wmsName: 'spggcee:wdar_min_cst_path', wfsName: 'spggcee:wdar_min_cst_path', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '광역 생태축', name: '광역 핵심 지역', wmsName: 'spggcee:wdar_core_rgn', wfsName: 'spggcee:wdar_core_rgn', type: 'vector' },

  // 지역 생태축
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv1 지역 생태축', wmsName: 'spggcee:rst_rgn_lv1_min_cst_pass', wfsName: '', type: 'raster' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv1 핵심 지역', wmsName: 'spggcee:rgn_lv1_core_rgn', wfsName: 'spggcee:rgn_lv1_core_rgn', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv1 최소 비용 경로', wmsName: 'spggcee:min_cst_path_lv1', wfsName: 'spggcee:min_cst_path_lv1', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv2 지역 생태축', wmsName: 'spggcee:rst_rgn_lv2_min_cst_pass', wfsName: '', type: 'raster' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv2 핵심 지역', wmsName: 'spggcee:rgn_lv2_core_rgn', wfsName: 'spggcee:rgn_lv2_core_rgn', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv2 최소 비용 경로', wmsName: 'spggcee:min_cst_path_lv2', wfsName: 'spggcee:min_cst_path_lv2', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv3 복원 기회', wmsName: 'spggcee:rst_rgn_lv3_rstrt_tppty', wfsName: '', type: 'raster' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv3 지역 생태축', wmsName: 'spggcee:rst_rgn_lv3_min_cst_pass', wfsName: '', type: 'raster' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv3 핵심 지역', wmsName: 'spggcee:rgn_lv3_core_rgn', wfsName: 'spggcee:rgn_lv3_core_rgn', type: 'vector' },
  { category: '도시생태현황지도', subcategory: '지역 생태축', name: 'Lv3 최소 비용 경로', wmsName: 'spggcee:min_cst_path_lv3', wfsName: 'spggcee:min_cst_path_lv3', type: 'vector' },

  // 탄소흡수원
  { category: '도시생태현황지도', subcategory: '탄소흡수원', name: '탄소흡수지도(비오톱)', wmsName: 'spggcee:biotop_cbn_abpvl', wfsName: 'spggcee:biotop_cbn_abpvl', type: 'vector' },

  // ===== 탄소공간 =====
  // 탄소배출
  { category: '탄소공간', subcategory: '탄소배출', name: '건물정보', wmsName: 'spggcee:bldg_info', wfsName: 'spggcee:bldg_info', type: 'vector' },

  // 탄소저장(수목)
  { category: '탄소공간', subcategory: '탄소저장(수목)', name: '산림 수목정보 지도', wmsName: 'spggcee:vsv', wfsName: 'spggcee:vsv', type: 'vector' },
  { category: '탄소공간', subcategory: '탄소저장(수목)', name: '산림 층위구조 지도', wmsName: 'spggcee:rst_vsv', wfsName: '', type: 'raster' },
  { category: '탄소공간', subcategory: '탄소저장(수목)', name: '수목 탄소저장지도', wmsName: 'spggcee:plnt_cbn_strgat_biotop', wfsName: 'spggcee:plnt_cbn_strgat_biotop', type: 'vector' },

  // 탄소저장(토양)
  { category: '탄소공간', subcategory: '탄소저장(토양)', name: '토양 미생물 탄소 저장', wmsName: 'spggcee:rst_soil_mrcog_cbn_strgat_32652', wfsName: '', type: 'raster' },
  { category: '탄소공간', subcategory: '탄소저장(토양)', name: '토양 탄소 분획', wmsName: 'spggcee:rst_soilfrc_poc_32652', wfsName: '', type: 'raster' },
  { category: '탄소공간', subcategory: '탄소저장(토양)', name: '토양 탄소 취약성', wmsName: 'spggcee:rst_soil_cbn_vul_32652', wfsName: '', type: 'raster' },
  { category: '탄소공간', subcategory: '탄소저장(토양)', name: '토양 조사 정보', wmsName: 'spggcee:soil_pckng_pstn', wfsName: 'spggcee:soil_pckng_pstn', type: 'vector' },
  { category: '탄소공간', subcategory: '탄소저장(토양)', name: '토양 탄소저장(10m)', wmsName: 'spggcee:rst_soil_cbn_strgat_32652', wfsName: '', type: 'raster' },
  { category: '탄소공간', subcategory: '탄소저장(토양)', name: '토양 탄소저장(비오톱)', wmsName: 'spggcee:soil_cbn_strgat', wfsName: 'spggcee:soil_cbn_strgat', type: 'vector' },

  // 탄소흡수(수목)
  { category: '탄소공간', subcategory: '탄소흡수(수목)', name: '엽면적 지수(LAI)', wmsName: 'spggcee:rst_lai', wfsName: '', type: 'raster' },
  { category: '탄소공간', subcategory: '탄소흡수(수목)', name: '총일차 생산량(GPP)', wmsName: 'spggcee:rst_gpp', wfsName: '', type: 'raster' },
  { category: '탄소공간', subcategory: '탄소흡수(수목)', name: '탄소흡수(10m)', wmsName: 'spggcee:rst_npp', wfsName: '', type: 'raster' },
  { category: '탄소공간', subcategory: '탄소흡수(수목)', name: '탄소흡수(비오톱)', wmsName: 'spggcee:biotop_cbn_abpvl', wfsName: 'spggcee:biotop_cbn_abpvl', type: 'vector' },

  // ===== 태양광 =====
  // 규제지역
  { category: '태양광', subcategory: '규제지역', name: '경관보호구역', wmsName: 'spggcee:landscape', wfsName: 'spggcee:landscape', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '경사도 15도 이상', wmsName: 'spggcee:rst_slope_15_ovr', wfsName: '', type: 'raster' },
  { category: '태양광', subcategory: '규제지역', name: '국가등록문화재', wmsName: 'spggcee:national_registered_property', wfsName: 'spggcee:national_registered_property', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '국가지정문화재', wmsName: 'spggcee:national_cultural_property', wfsName: 'spggcee:national_cultural_property', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '국가지정문화재보호구역', wmsName: 'spggcee:national_cultural_property_zone', wfsName: 'spggcee:national_cultural_property_zone', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '국립공원', wmsName: 'spggcee:national_park', wfsName: 'spggcee:national_park', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '군립공원', wmsName: 'spggcee:county_park', wfsName: 'spggcee:county_park', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '도립공원', wmsName: 'spggcee:provincial_park', wfsName: 'spggcee:provincial_park', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '산림유전자원보호구역', wmsName: 'spggcee:forest_genetic_resource_protection_area', wfsName: 'spggcee:forest_genetic_resource_protection_area', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '산사태 1등급', wmsName: 'spggcee:ldsld_grd1', wfsName: 'spggcee:ldsld_grd1', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '상수원보호구역', wmsName: 'spggcee:drinking_water_protection_area', wfsName: 'spggcee:drinking_water_protection_area', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '생태자연도 1등급', wmsName: 'spggcee:eco1_mgmt_area', wfsName: 'spggcee:eco1_mgmt_area', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '수변구역', wmsName: 'spggcee:riparian_zone', wfsName: 'spggcee:riparian_zone', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '수원함양보호구역', wmsName: 'spggcee:watershed_conservation_area', wfsName: 'spggcee:watershed_conservation_area', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '습지보호구역', wmsName: 'spggcee:wetland_protection_area', wfsName: 'spggcee:wetland_protection_area', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '시도지정문화재', wmsName: 'spggcee:local_cultural_property', wfsName: 'spggcee:local_cultural_property', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '시도지정문화재보호구역', wmsName: 'spggcee:local_cultural_property_zone', wfsName: 'spggcee:local_cultural_property_zone', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '야생동식물보호구역', wmsName: 'spggcee:wildlife_protection_area', wfsName: 'spggcee:wildlife_protection_area', type: 'vector' },
  { category: '태양광', subcategory: '규제지역', name: '재해방지보호구역', wmsName: 'spggcee:disaster_prevention_protection_area', wfsName: 'spggcee:disaster_prevention_protection_area', type: 'vector' },

  // 태양광 발전현황
  { category: '태양광', subcategory: '발전현황', name: '태양광 발전 현황', wmsName: 'spggcee:tm_sunl_fclt_pstn', wfsName: 'spggcee:tm_sunl_fclt_pstn', type: 'vector' },
  { category: '태양광', subcategory: '발전현황', name: '태양광 설치 예정지', wmsName: 'spggcee:sunl_fclt_lcpmt', wfsName: 'spggcee:sunl_fclt_lcpmt', type: 'vector' },

  // 태양광 잠재량
  { category: '태양광', subcategory: '잠재량', name: '기술적 잠재량 (옥상)', wmsName: 'spggcee:rst_tech_sunl_genqy_kier_bldg', wfsName: '', type: 'raster' },
  { category: '태양광', subcategory: '잠재량', name: '기술적 잠재량 (지상)', wmsName: 'spggcee:rst_tech_sunl_genqy_kier_grnd', wfsName: '', type: 'raster' },
  { category: '태양광', subcategory: '잠재량', name: '시장 잠재량 (옥상)', wmsName: 'spggcee:rst_mrkt_sunl_genqy_kier_bldg', wfsName: '', type: 'raster' },
  { category: '태양광', subcategory: '잠재량', name: '시장 잠재량 (지상)', wmsName: 'spggcee:rst_mrkt_sunl_genqy_kier_grnd', wfsName: '', type: 'raster' },
  { category: '태양광', subcategory: '잠재량', name: '이론적 잠재량 (옥상)', wmsName: 'spggcee:rst_thry_sunl_genqy_kier_bldg', wfsName: '', type: 'raster' },
  { category: '태양광', subcategory: '잠재량', name: '이론적 잠재량 (지상)', wmsName: 'spggcee:rst_thry_sunl_genqy_kier_grnd', wfsName: '', type: 'raster' },

  // ===== 행정구역 =====
  { category: '행정구역', subcategory: '경계', name: '개발제한구역', wmsName: 'spggcee:lsmd_cont_ud801_41', wfsName: 'spggcee:lsmd_cont_ud801_41', type: 'vector' },
  { category: '행정구역', subcategory: '경계', name: '도시계획구역', wmsName: 'spggcee:lsmd_cont_zh001_41', wfsName: 'spggcee:lsmd_cont_zh001_41', type: 'vector' },
  { category: '행정구역', subcategory: '경계', name: '문화재보호구역', wmsName: 'spggcee:lsmd_cont_zh002_41', wfsName: 'spggcee:lsmd_cont_zh002_41', type: 'vector' },
  { category: '행정구역', subcategory: '경계', name: '공공문화체육시설', wmsName: 'spggcee:lsmd_cont_uq164_41', wfsName: 'spggcee:lsmd_cont_uq164_41', type: 'vector' },
  { category: '행정구역', subcategory: '경계', name: '도시지역', wmsName: 'spggcee:lsmd_cont_uq111_41', wfsName: 'spggcee:lsmd_cont_uq111_41', type: 'vector' },
  { category: '행정구역', subcategory: '경계', name: '보건위생시설', wmsName: 'spggcee:lsmd_cont_uq166_41', wfsName: 'spggcee:lsmd_cont_uq166_41', type: 'vector' },
  { category: '행정구역', subcategory: '경계', name: '취락지구', wmsName: 'spggcee:lsmd_cont_uq128_41', wfsName: 'spggcee:lsmd_cont_uq128_41', type: 'vector' },
  { category: '행정구역', subcategory: '경계', name: '농업진흥지역', wmsName: 'spggcee:lsmd_cont_ue101_41', wfsName: 'spggcee:lsmd_cont_ue101_41', type: 'vector' },
  { category: '행정구역', subcategory: '경계', name: '문화재보호', wmsName: 'spggcee:lsmd_cont_uo301_41', wfsName: 'spggcee:lsmd_cont_uo301_41', type: 'vector' },
];

// 카테고리별로 그룹화
export const getLayersByCategory = () => {
  const grouped: Record<string, Record<string, LayerInfo[]>> = {};

  ALL_LAYERS.forEach(layer => {
    if (!grouped[layer.category]) {
      grouped[layer.category] = {};
    }
    if (!grouped[layer.category][layer.subcategory]) {
      grouped[layer.category][layer.subcategory] = [];
    }
    grouped[layer.category][layer.subcategory].push(layer);
  });

  return grouped;
};

// 레이어 검색
export const searchLayers = (query: string): LayerInfo[] => {
  const lowerQuery = query.toLowerCase();
  return ALL_LAYERS.filter(layer =>
    layer.name.toLowerCase().includes(lowerQuery) ||
    layer.category.toLowerCase().includes(lowerQuery) ||
    layer.subcategory.toLowerCase().includes(lowerQuery)
  );
};

// 벡터 레이어만 가져오기 (WFS 가능)
export const getVectorLayers = (): LayerInfo[] => {
  return ALL_LAYERS.filter(layer => layer.type === 'vector');
};

// 래스터 레이어만 가져오기 (WMS만 가능)
export const getRasterLayers = (): LayerInfo[] => {
  return ALL_LAYERS.filter(layer => layer.type === 'raster');
};
