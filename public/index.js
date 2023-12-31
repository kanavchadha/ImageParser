const dropContainer = document.getElementById("dropcontainer");
const fileInput = document.getElementById("file");
const code = document.getElementById("jsoncode");
const codeContainer = document.getElementById('result');
const loader = document.getElementById('loader');

dropContainer.addEventListener("dragover", (e) => {
    // prevent default to allow drop
    e.preventDefault()
}, false)

dropContainer.addEventListener("dragenter", () => {
    dropContainer.classList.add("drag-active")
})

dropContainer.addEventListener("dragleave", () => {
    dropContainer.classList.remove("drag-active")
})

dropContainer.addEventListener("drop", (e) => {
    e.preventDefault()
    dropContainer.classList.remove("drag-active")
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        for (let x = 0; x < e.dataTransfer.files.length; x++) {
            const file = e.dataTransfer.files[x];
            if (file.type !== 'image/jpeg' && file[0].type !== 'image/png' && file[0].type !== 'image/jpg') {
                return alert('Please select a valid image file');
            }
        }
    }
    fileInput.files = e.dataTransfer.files
})

fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        for (let x = 0; x < e.target.files.length; x++) {
            const file = e.target.files[x];
            if (file.type !== 'image/jpeg' && file[0].type !== 'image/png' && file[0].type !== 'image/jpg') {
                fileInput.value = '';
                return alert('Please select a valid image file');
            }
        }
    }
})

const uploadFile = async () => {
    codeContainer.style.display = 'none';
    if (!fileInput.files || fileInput.files.length <= 0) {
        alert('No File Selected! Please select any valid file.');
        return;
    }
    try {
        loader.classList.add('active');
        const data = new FormData()
        for (let x = 0; x < fileInput.files.length; x++) {
            data.append('file', fileInput.files[x]);
        }
        const res = await fetch('/parse-expenso-file', {
            method: 'POST',
            body: data
        });
        const parsedData = await res.json();
        if (parsedData.error) {
            throw new Error(parsedData.error);
        }
        loader.classList.remove('active');
        code.innerText = JSON.stringify(parsedData, null, 4);
        codeContainer.style.display = 'block';
    } catch (error) {
        loader.classList.remove('active');
        alert('Something Went Wrong! Please Try again with downloading file on your local system. ' + error.message);
    }
}

const copyToClipboard = () => {
    const copyText = document.getElementById("jsoncode");
    navigator.clipboard.writeText(copyText.innerText).then(res => {
        alert("Copied the text successfully");
    }).catch(err => {
        alert("Error in Copying text: " + err.message);
    });
}