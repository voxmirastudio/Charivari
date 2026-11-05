
cmake_minimum_required(VERSION 3.16)

set(CMAKE_CXX_STANDARD 17)

set(CMAJ_CMAKE_PROJECT_NAME "Charivari")
set(CMAJ_TARGET_BUNDLE_ID "com.voxmirastudio.charivari")
set(CMAJ_TARGET_PATCH_VERSION "1.0.1")
set(CMAJ_TARGET_NAME "Charivari")
set(CMAJ_TARGET_BUNDLE_NAME "${CMAJ_TARGET_NAME}")
set(CMAJ_TARGET_BUNDLE_VERSION "${CMAJ_TARGET_PATCH_VERSION}")
set(CMAJ_TARGET_SHORT_VERSION_STRING "${CMAJ_TARGET_PATCH_VERSION}")
set(CMAJ_TARGET_MANUFACTURER "Vox Mira Studio")
set(CMAJ_TARGET_MANUFACTURER_CODE "VxMs")
set(CMAJ_TARGET_PLUGIN_CODE "Chrv")



if(NOT CMAJ_INCLUDE_PATH)
    set(CMAJ_INCLUDE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/include")
endif()

if(NOT CMAJ_PLUGIN_HELPERS_PATH)
    set(CMAJ_PLUGIN_HELPERS_PATH "${CMAKE_CURRENT_SOURCE_DIR}/helpers")
endif()

project("${CMAJ_CMAKE_PROJECT_NAME}" VERSION "${CMAJ_TARGET_PATCH_VERSION}" LANGUAGES CXX C)

# (1.0.1, Vox Mira Studio) Linux: the plugins are shared objects that link static libraries of clap-wrapper and the VST 3 SDK
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Vox Mira Studio: clap-wrapper turns Objective-C/C++ on in its own folder only; the VST3 and AU targets made here need it too
if (APPLE)
    enable_language(OBJC)
    enable_language(OBJCXX)
endif()

OPTION (WEBKIT2_GTK_VERSION "Which version of webkit to use")

if (${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
    if (NOT CMAKE_OSX_ARCHITECTURES)
        set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64")
    endif()
    set(CMAKE_OSX_DEPLOYMENT_TARGET "10.15")
endif()

if (${CMAKE_SYSTEM_NAME} MATCHES "Linux")
    if (NOT WEBKIT2_GTK_VERSION)
        find_package (PkgConfig REQUIRED)

        pkg_check_modules (package_to_be_found webkit2gtk-4.1 QUIET)

        if(package_to_be_found_FOUND)
            set (WEBKIT2_GTK_VERSION "webkit2gtk-4.1")
        else()
            set (WEBKIT2_GTK_VERSION "webkit2gtk-4.0")
        endif()
    endif()

    message ("Using webkit ${WEBKIT2_GTK_VERSION}")
endif()

if(NOT CMAJ_PLUGIN_HELPERS_PATH)
    message (FATAL_ERROR "You must define the CMAJ_PLUGIN_HELPERS_PATH variable to point to your local plugin helpers folder")
endif()

add_subdirectory("${CMAJ_PLUGIN_HELPERS_PATH}/common" cmaj_plugin_helpers)
add_subdirectory("${CMAJ_PLUGIN_HELPERS_PATH}/clap" cmaj_clap_helpers)

if (CLAP_WRAPPER_PATH)
    set(CLAP_WRAPPER_DOWNLOAD_DEPENDENCIES TRUE)
    set(CLAP_WRAPPER_DONT_ADD_TARGETS TRUE)
    # (Vox Mira Studio: no AU — CLAP and VST3 only)
    add_subdirectory(${CLAP_WRAPPER_PATH} clap_wrapper)
endif()

add_library(${CMAJ_TARGET_NAME} MODULE entry.cpp)
target_link_libraries(${CMAJ_TARGET_NAME} PRIVATE cmaj_clap)
target_compile_options(${CMAJ_TARGET_NAME} PRIVATE $<$<CXX_COMPILER_ID:MSVC>:/Zc:__cplusplus>)
target_compile_definitions(${CMAJ_TARGET_NAME} PRIVATE $<$<CONFIG:Debug>:CMAJ_ENABLE_WEBVIEW_DEV_TOOLS=1> CMAJOR_DLL=1)

if(CMAKE_CXX_COMPILER_ID MATCHES "MSVC")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /bigobj")
endif()

if(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
    target_link_options(${CMAJ_TARGET_NAME} PRIVATE -exported_symbols_list "${CMAJ_PLUGIN_HELPERS_PATH}/clap/macos-symbols.txt")

    set_target_properties(${CMAJ_TARGET_NAME} PROPERTIES
        MACOSX_BUNDLE TRUE
        BUNDLE True
        BUNDLE_EXTENSION "clap"
        MACOSX_BUNDLE_GUI_IDENTIFIER "${CMAJ_TARGET_BUNDLE_ID}"
        XCODE_ATTRIBUTE_PRODUCT_BUNDLE_IDENTIFIER "${CMAJ_TARGET_BUNDLE_ID}"
        MACOSX_BUNDLE_BUNDLE_NAME ${CMAJ_TARGET_BUNDLE_NAME}
        MACOSX_BUNDLE_BUNDLE_VERSION ${CMAJ_TARGET_BUNDLE_VERSION}
        MACOSX_BUNDLE_SHORT_VERSION_STRING ${CMAJ_TARGET_SHORT_VERSION_STRING}
    )
else()
    set_target_properties(${CMAJ_TARGET_NAME} PROPERTIES
        SUFFIX ".clap"
        PREFIX ""
    )
endif()

if (CLAP_WRAPPER_PATH)
    # (1.0.1, Vox Mira Studio) the VST3 on macOS, Windows and Linux alike (cmaj generate made it for macOS only)
    if (APPLE OR WIN32 OR UNIX)
        set(VST3_TARGET ${CMAJ_TARGET_NAME}_vst3)
        add_library(${VST3_TARGET} MODULE)
        target_link_libraries(${VST3_TARGET} PRIVATE cmaj_clap)
        target_sources(${VST3_TARGET} PRIVATE entry.cpp)
        # (1.0, Vox Mira Studio) the VST3 bundle gets its own identifier and the version: without them clap-wrapper 0.17 wrote
        # « org.cleveraudio.wrapper.Charivari.vst3 » and the literal word MACOSX_BUNDLE_SHORT_VERSION_STRING as the version
        # (an empty BUNDLE_VERSION shifts its list of properties), which the installer compares when it upgrades
        target_add_vst3_wrapper(TARGET ${VST3_TARGET} OUTPUT_NAME ${CMAJ_CMAKE_PROJECT_NAME}
                                BUNDLE_IDENTIFIER "${CMAJ_TARGET_BUNDLE_ID}.vst3" BUNDLE_VERSION "${CMAJ_TARGET_PATCH_VERSION}"
                                WINDOWS_FOLDER_VST3 TRUE)
        target_compile_definitions(${VST3_TARGET} PRIVATE CMAJOR_DLL=1)
        target_compile_options(${VST3_TARGET} PRIVATE $<$<CXX_COMPILER_ID:MSVC>:/Zc:__cplusplus>)

    endif()
endif()
