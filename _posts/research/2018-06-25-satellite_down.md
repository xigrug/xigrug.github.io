---
layout: blog
tools: true
istop: false
title: "Satellite"
background-image: https://www.kozmikanafor.com/wp-content/uploads/2017/05/uydular-dunya-6754-660x330.jpg 
date:  2018-06-25 10:23:56
category: research
tags:
- research
- satellite
- data
- download
---

# 数据下载

[日期推算器](http://bjtime.cn/riqi.asp)

[第几天](https://www.epochconverter.com/days)

[eumetsat](https://www.eumetsat.int/website/home/Data/RegionalDataServiceEARS/EARSVIIRS/index.html) 只有欧洲的
## 综合

<a href="https://search.earthdata.nasa.gov/search" title="earthdata"> NASA Earthdata </a> download   

[Download Near Real-Time Data](https://earthdata.nasa.gov/earth-observation-data/near-real-time/download-nrt-data)


## 降水
<a href="http://bbs.06climate.com/forum.php?mod=viewthread&tid=48349&extra=&page=1" title="climate06"> TRMM(TMI 3-day)降水数据的详细下载方法 </a> download

<a href="https://rda.ucar.edu/datasets/ds502.1/" title="CMORPH"> NOAA CPC Morphing Technique (CMORPH) </a> Global Precipitation Analyses Version 0.x

##  Hamawari 8
<a href="http://www.eorc.jaxa.jp/ptree/" title="葵花8"> Hamawari 8 </a> download   

<a href="https://seg-web.nict.go.jp/wsdb_osndisk/shareDirDownload/bDw2maKV?lang=en" title="葵花8"> Hamawari 8 </a> picture download   
## NPP

[NPP 数据下载](http://www.class.ngdc.noaa.gov/saa/products/search?sub_id=0&datatype_family=VIIRS_SDR&submit.x=22&submit.y=4)

[NPP轨道图](http://www.ssec.wisc.edu/datacenter/npp/)

[VIIRS Imagery and Visualization Team Blog](http://rammb.cira.colostate.edu/projects/npp/blog/)

[VIIRS Products](https://weather.msfc.nasa.gov/sport/jpsspg/viirs.html)

[Beginner_Guide_to_VIIRS_Imagery_Data](http://rammb.cira.colostate.edu/projects/npp/Beginner_Guide_to_VIIRS_Imagery_Data.pdf)

[VIIRS Imagery and Visualization Team](http://rammb.cira.colostate.edu/projects/npp/)

[satellite-missions](https://directory.eoportal.org/web/eoportal/satellite-missions/s/suomi-npp)
## MODIS

[MODIS数据的简介和下载（一）——MODIS数据简介](https://blog.csdn.net/ESA_DSQ/article/details/70080617)

[MODIS数据的简介和下载（二）——MODIS数据下载方式FTP](https://blog.csdn.net/ESA_DSQ/article/details/70171937)

[FTP地址](https://ladsweb.modaps.eosdis.nasa.gov/archive/allData/61/MOD02HKM/2018/)
## Calipso

[Calipso 数据浏览](http://www-calipso.larc.nasa.gov/products/lidar/browse_images/show_calendar.php)


----

# 绘图及工具

<a href="https://pythonhosted.org/OrbitalPy/examples/plotting/plotting/" title="OrbitalPy"> OrbitalPy </a> [pyorbital](http://pyorbital.readthedocs.io/en/latest/)

<a href="http://ccplot.org/" title="CCPLOT"> CCPLOT </a>  (CloudSat and CALIPSO plotting tool)

<a href="https://www.science-emergence.com/Codes/Plot-MODIS-granule-RGB-image-orthographic-projection-using-python-and-basemap/" title="Benjamin Marchant"> Benjamin Marchant </a> Plot MODIS granule RGB image (orthographic projection) using python and basemap
[another](https://www.science-emergence.com/Codes/Plot-MODIS-granule-RGB-image-using-python/)

<a href="http://python-awips.readthedocs.io/en/latest/examples/index.html" title="python-awips"> python-awips </a> have a <a href="http://nbviewer.jupyter.org/github/Unidata/python-awips/tree/master/examples/notebooks/" title="notebooks">jupyter notebooks </a> 

[polar2grid](http://www.ssec.wisc.edu/software/polar2grid/)

**[Hdfeos](http://hdfeos.org/zoo/index_openGESDISC_Examples.php)**

<a href="http://satpy.readthedocs.io/en/latest/" title="Satpy"> Satpy</a>’s Documentation [jupyter notebooks](https://nbviewer.jupyter.org/github/pytroll/pytroll-examples/tree/master/satpy/)

**[pytroll](http://pytroll.github.io/)  [Gallery](http://pytroll.github.io/gallery.html) [User guide](https://media.readthedocs.org/pdf/pytroll/latest/pytroll.pdf)**  [Trollimage](http://trollimage.readthedocs.io/en/latest/index.html)

![picture](https://nbviewer.jupyter.org/github/pytroll/pytroll-examples/blob/master/satpy/natural_hrit.png)

![picture1](https://media.githubusercontent.com/media/pytroll/pytroll-examples/master/satpy/truecolor_viirs_smoke_thumb.png)

![picture2](https://media.githubusercontent.com/media/pytroll/pytroll-examples/master/satpy/viirs_true_color_20180225_thumb.png)
----

[cspp](http://cimss.ssec.wisc.edu/cspp/)

[python-awips](http://python-awips.readthedocs.io/en/latest/examples/generated/Satellite_Imagery.html)
# 教程

Satellite <a href="https://pmm.nasa.gov/education/websites/satellite-meteorology-learning-modules" title="Meteorology"> Meteorology </a> Learning Modules

```
Learning Modules:
Introduction to Satellite Meteorology

[Benjamin Marchant](https://www.science-emergence.com/Notebooks/6364d3f0f495b6ab9dcf8d3b5c6e0b01/Images/)
Weather Satellites and Orbits
Electromagnetic Radiation
Cloud Identification
Satellite Images
Satellite Winds
Weather Forecasting
Wild Weather
Monitoring the Global Environment
Three New Satellites: Suomi NPP, JPSS, and GOES-R
```
## MODIS
[Multi-spectral Satellite Products (MODIS)](https://cimss.ssec.wisc.edu/rss/geoss/source/Lecture_MODIS_products.pdf)

[Creating Reprojected True Color MODIS Images: A Tutorial](https://cdn.earthdata.nasa.gov/conduit/upload/946/MODIS_True_Color.pdf)
# 脚本

[Collection of various scripts and modules related to the VIIRS imager](https://gitlab.ssec.wisc.edu/JPSS_ADL/VIIRS/)

example [plot_viirs_cloudProducts.py](https://gitlab.ssec.wisc.edu/JPSS_ADL/VIIRS/blob/master/plot_viirs_cloudProducts.py)
        [grid_VIIRS_RGB.py](https://gitlab.ssec.wisc.edu/JPSS_ADL/VIIRS/blob/master/grid_VIIRS_RGB.py)

# 产品 

## Precipitation Products

[ospo](http://www.ospo.noaa.gov/Products/atmosphere/rain.html)

