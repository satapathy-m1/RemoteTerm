from setuptools import setup, find_packages

setup(
    name='remoterm',
    version='0.1.0',
    packages=find_packages(),
    install_requires=[
        'click',
        'ptyprocess',
        'websockets',
        'httpx',
    ],
    entry_points={
        'console_scripts': [
            'remoterm=remoterm.main:cli',
        ],
    },
)